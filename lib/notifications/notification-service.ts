import { promises as fs } from 'fs';
import path from 'path';
import { ExtendedNotification, NotificationStats, NotificationFilter } from '@/types/notifications';
import { notificationPreferencesService } from '../../scripts/init-notification-preferences';
import { AuditUser } from '@/types/audit';

const NOTIFICATIONS_FILE = path.join(process.cwd(), 'data', 'notifications.json');

// Map pour stocker les connexions SSE par utilisateur
const sseConnections = new Map<string, Set<ReadableStreamDefaultController>>();

// Interface pour les messages SSE
interface SSEMessage {
  type: 'notification' | 'connected' | 'heartbeat';
  userId?: string;
  data?: any;
  timestamp?: number;
}

class NotificationService {
  // Méthode pour s'assurer que le fichier de notifications existe
  private async ensureNotificationsFile(): Promise<void> {
    try {
      await fs.access(NOTIFICATIONS_FILE);
    } catch {
      // Le fichier n'existe pas, le créer
      const dataDir = path.dirname(NOTIFICATIONS_FILE);
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify([], null, 2));
    }
  }

  // Méthode pour lire les notifications depuis le fichier JSON
  private async readNotifications(): Promise<ExtendedNotification[]> {
    try {
      await this.ensureNotificationsFile();
      const data = await fs.readFile(NOTIFICATIONS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading notifications file:', error);
      return [];
    }
  }

  // Méthode pour écrire les notifications dans le fichier JSON
  private async writeNotifications(notifications: ExtendedNotification[]): Promise<void> {
    try {
      await this.ensureNotificationsFile();
      await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
    } catch (error) {
      console.error('Error writing notifications file:', error);
      throw error;
    }
  }

  // Méthode pour enregistrer une connexion SSE
  registerSSEConnection(userId: string, controller: ReadableStreamDefaultController): void {
    if (!sseConnections.has(userId)) {
      sseConnections.set(userId, new Set());
    }
    sseConnections.get(userId)?.add(controller);
    console.log(`SSE connection registered for user ${userId}`);
  }

  // Méthode pour désenregistrer une connexion SSE
  unregisterSSEConnection(userId: string, controller: ReadableStreamDefaultController): void {
    const userConnections = sseConnections.get(userId);
    if (userConnections) {
      userConnections.delete(controller);
      if (userConnections.size === 0) {
        sseConnections.delete(userId);
      }
    }
    console.log(`SSE connection unregistered for user ${userId}`);
  }

  // Méthode pour envoyer une notification via SSE
  private sendSSENotification(userId: string, notification: ExtendedNotification): boolean {
    const userControllers = sseConnections.get(userId);
    
    if (!userControllers || userControllers.size === 0) {
      return false;
    }

    const message: SSEMessage = {
      type: 'notification',
      userId,
      data: notification,
      timestamp: Date.now()
    };

    const messageStr = `data: ${JSON.stringify(message)}\n\n`;
    const encoder = new TextEncoder();
    const encodedMessage = encoder.encode(messageStr);

    let successCount = 0;
    const controllersToRemove: ReadableStreamDefaultController[] = [];

    userControllers.forEach(controller => {
      try {
        controller.enqueue(encodedMessage);
        successCount++;
      } catch (error) {
        console.error(`Error sending SSE notification to user ${userId}:`, error);
        controllersToRemove.push(controller);
      }
    });

    // Nettoyer les controllers défaillants
    controllersToRemove.forEach(controller => {
      userControllers.delete(controller);
    });

    if (userControllers.size === 0) {
      sseConnections.delete(userId);
    }

    return successCount > 0;
  }

  // Méthode utilitaire pour convertir AuditUser vers le format ExtendedNotification
  private convertAuditUserToTriggeredBy(auditUser: AuditUser): { userId: string; userName: string; userEmail: string; } {
    return {
      userId: auditUser.id,
      userName: auditUser.name,
      userEmail: auditUser.email
    };
  }

  // Méthode pour créer une nouvelle notification
  async createNotification(
    userId: string,
    role: string,
    module: string,
    actionType: string,
    message: string,
    details: any = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    entityType?: string,
    entityId?: string,
    triggeredBy?: AuditUser
  ): Promise<ExtendedNotification> {
    const notification: ExtendedNotification = {
      id: crypto.randomUUID(),
      userId,
      role,
      module,
      actionType,
      message,
      details,
      createdAt: new Date().toISOString(),
      isRead: false,
      severity,
      entityId,
      entityType,
      triggeredBy: triggeredBy ? this.convertAuditUserToTriggeredBy(triggeredBy) : undefined
    };

    try {
      // Lire les notifications existantes
      const notifications = await this.readNotifications();
      
      // Ajouter la nouvelle notification
      notifications.unshift(notification);
      
      // Sauvegarder dans le fichier JSON
      await this.writeNotifications(notifications);
      
      // Envoyer via SSE si l'utilisateur est connecté
      const sseSuccess = this.sendSSENotification(userId, notification);
      
      console.log(`Notification created for user ${userId}: ${notification.id}, SSE sent: ${sseSuccess}`);
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Méthode pour obtenir les notifications d'un utilisateur
  async getNotifications(
    userId: string,
    filters: NotificationFilter = {}
  ): Promise<{ notifications: ExtendedNotification[]; total: number }> {
    try {
      const allNotifications = await this.readNotifications();
      
      // Filtrer par utilisateur
      let userNotifications = allNotifications.filter(n => n.userId === userId);
      
      // Appliquer les filtres
      if (filters.module) {
        userNotifications = userNotifications.filter(n => n.module === filters.module);
      }
      
      if (filters.severity) {
        userNotifications = userNotifications.filter(n => n.severity === filters.severity);
      }
      
      if (filters.isRead !== undefined) {
        userNotifications = userNotifications.filter(n => n.isRead === filters.isRead);
      }
      
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        userNotifications = userNotifications.filter(n => new Date(n.createdAt) >= fromDate);
      }
      
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        userNotifications = userNotifications.filter(n => new Date(n.createdAt) <= toDate);
      }
      
      const total = userNotifications.length;
      
      // Pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 20;
      const paginatedNotifications = userNotifications.slice(offset, offset + limit);
      
      return {
        notifications: paginatedNotifications,
        total
      };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { notifications: [], total: 0 };
    }
  }

  // Méthode pour obtenir une notification par ID
  async getNotificationById(notificationId: string): Promise<ExtendedNotification | null> {
    try {
      const notifications = await this.readNotifications();
      return notifications.find(n => n.id === notificationId) || null;
    } catch (error) {
      console.error('Error getting notification by ID:', error);
      return null;
    }
  }

  // Méthode pour marquer une notification comme lue
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const notifications = await this.readNotifications();
      const notificationIndex = notifications.findIndex(n => n.id === notificationId);
      
      if (notificationIndex === -1) {
        return false;
      }
      
      notifications[notificationIndex].isRead = true;
      
      await this.writeNotifications(notifications);
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Méthode pour marquer toutes les notifications d'un utilisateur comme lues
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const notifications = await this.readNotifications();
      let hasChanges = false;
      
      notifications.forEach(notification => {
        if (notification.userId === userId && !notification.isRead) {
          notification.isRead = true;
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        await this.writeNotifications(notifications);
      }
      
      return hasChanges;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  // Méthode pour obtenir les statistiques des notifications
  async getStats(userId: string): Promise<NotificationStats> {
    try {
      const notifications = await this.readNotifications();
      const userNotifications = notifications.filter(n => n.userId === userId);
      
      const stats: NotificationStats = {
        total: userNotifications.length,
        unread: userNotifications.filter(n => !n.isRead).length,
        byModule: {},
        bySeverity: {}
      };
      
      // Compter par module
      userNotifications.forEach(notification => {
        stats.byModule[notification.module] = (stats.byModule[notification.module] || 0) + 1;
      });
      
      // Compter par sévérité
      userNotifications.forEach(notification => {
        stats.bySeverity[notification.severity] = (stats.bySeverity[notification.severity] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return {
        total: 0,
        unread: 0,
        byModule: {},
        bySeverity: {}
      };
    }
  }

  // Méthode pour supprimer une notification
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const notifications = await this.readNotifications();
      const filteredNotifications = notifications.filter(n => n.id !== notificationId);
      
      if (filteredNotifications.length === notifications.length) {
        return false; // Notification non trouvée
      }
      
      await this.writeNotifications(filteredNotifications);
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  // Méthode pour supprimer toutes les notifications d'un utilisateur
  async deleteAllUserNotifications(userId: string): Promise<boolean> {
    try {
      const notifications = await this.readNotifications();
      const filteredNotifications = notifications.filter(n => n.userId !== userId);
      
      await this.writeNotifications(filteredNotifications);
      return true;
    } catch (error) {
      console.error('Error deleting all user notifications:', error);
      return false;
    }
  }

  // Méthode pour nettoyer les anciennes notifications (plus de X jours)
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    try {
      const notifications = await this.readNotifications();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const filteredNotifications = notifications.filter(n => 
        new Date(n.createdAt) > cutoffDate
      );
      
      const deletedCount = notifications.length - filteredNotifications.length;
      
      if (deletedCount > 0) {
        await this.writeNotifications(filteredNotifications);
        console.log(`Cleaned up ${deletedCount} old notifications`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return 0;
    }
  }

  // Méthode pour diffuser une notification à tous les utilisateurs connectés via SSE
  broadcastSSE(notification: any): number {
    const message: SSEMessage = {
      type: 'notification',
      data: notification,
      timestamp: Date.now()
    };

    const messageStr = `data: ${JSON.stringify(message)}\n\n`;
    const encoder = new TextEncoder();
    const encodedMessage = encoder.encode(messageStr);

    let totalSent = 0;
    const usersToCleanup: string[] = [];

    sseConnections.forEach((controllers, userId) => {
      const controllersToRemove: ReadableStreamDefaultController[] = [];
      
      controllers.forEach(controller => {
        try {
          controller.enqueue(encodedMessage);
          totalSent++;
        } catch (error) {
          console.error(`Error broadcasting to user ${userId}:`, error);
          controllersToRemove.push(controller);
        }
      });

      // Nettoyer les controllers défaillants
      controllersToRemove.forEach(controller => {
        controllers.delete(controller);
      });

      if (controllers.size === 0) {
        usersToCleanup.push(userId);
      }
    });

    // Nettoyer les utilisateurs sans connexions actives
    usersToCleanup.forEach(userId => {
      sseConnections.delete(userId);
    });

    console.log(`Broadcast sent to ${totalSent} connections across ${sseConnections.size} users`);
    return totalSent;
  }

  // Méthode pour obtenir le statut des connexions SSE
  getSSEConnectionStatus(): { totalUsers: number; totalConnections: number } {
    let totalConnections = 0;
    
    sseConnections.forEach(connections => {
      totalConnections += connections.size;
    });

    return {
      totalUsers: sseConnections.size,
      totalConnections
    };
  }

  // Méthode utilitaire pour créer une notification avec audit automatique
  async createNotificationWithAudit(
    userId: string,
    role: string,
    module: string,
    actionType: string,
    message: string,
    details: any = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    entityType?: string,
    entityId?: string,
    triggeredByUserId?: string,
    triggeredByUserName?: string,
    triggeredByUserEmail?: string,
    triggeredByUserRole?: string
  ): Promise<ExtendedNotification> {
    let triggeredBy: AuditUser | undefined;
    
    if (triggeredByUserId && triggeredByUserName && triggeredByUserEmail && triggeredByUserRole) {
      triggeredBy = {
        id: triggeredByUserId,
        name: triggeredByUserName,
        email: triggeredByUserEmail,
        role: triggeredByUserRole
      };
    }

    return this.createNotification(
      userId,
      role,
      module,
      actionType,
      message,
      details,
      severity,
      entityType,
      entityId,
      triggeredBy
    );
  }
}

// Instance singleton
const notificationService = new NotificationService();
export { notificationService };
export default notificationService;