import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { NotificationFilter } from '@/types/notifications';

interface NotificationUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface RoleBasedNotification {
  id: string;
  targetRoles: string[]; // Rôles concernés par cette notification
  module: string;
  actionType: string;
  message: any;
  details: string;
  createdAt: string;
  isRead: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  // Utilisateurs spécifiquement concernés (en plus des rôles)
  specificUsers?: Array<{
    id: string;
    email: string;
    reason: string; // 'createdBy', 'assignedTo', 'mentioned', etc.
  }>;
  // Métadonnées pour le contexte
  metadata?: {
    entityId?: string;
    entityType?: string;
    createdBy?: string;
    assignedTo?: string[];
    triggeredBy?: string;
    [key: string]: any;
  };
}

interface UserNotificationPreferences {
  [module: string]: {
    [actionType: string]: boolean;
  };
}

interface NotificationReadStatus {
  id: string;
  userId: string;
  notificationId: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ExtendedNotification {
  id: string;
  userId: string;
  role: string;
  module: string;
  actionType: string;
  message: any;
  details: string;
  createdAt: string;
  isRead: boolean;
  severity: string;
  reason: 'role' | 'specific'; // Pourquoi l'utilisateur reçoit cette notification
  specificReason?: string; // Si reason='specific', pourquoi spécifiquement
  entityType?: string;
  entityId?: string;
  triggeredBy?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byModule: Record<string, number>;
  bySeverity: Record<string, number>;
  byReason: Record<string, number>;
}

export class RoleBasedNotificationService {
  private static readonly NOTIFICATIONS_FILE = '/var/www/labo.sekrane.fr/data/notifications.json';
  private static readonly PREFERENCES_FILE = '/var/www/labo.sekrane.fr/data/notification-preferences.json';
  private static readonly READ_STATUS_FILE = '/var/www/labo.sekrane.fr/data/notification-read-status.json';

  // Rôles disponibles dans le système
  private static readonly ROLES = [
    'ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN', 'GUEST'
  ];

  // Modules disponibles dans le système
  private static readonly MODULES = [
    'USERS', 'CHEMICALS', 'EQUIPMENT', 'ROOMS', 'CALENDAR', 'ORDERS', 'SECURITY', 'SYSTEM'
  ];

  /**
   * Lire les notifications du fichier JSON
   */
  private static async readNotifications(): Promise<RoleBasedNotification[]> {
    try {
      if (!fs.existsSync(this.NOTIFICATIONS_FILE)) {
        console.warn(`Fichier notifications non trouvé: ${this.NOTIFICATIONS_FILE}`);
        return [];
      }

      const rawContent = fs.readFileSync(this.NOTIFICATIONS_FILE, 'utf8');
      if (!rawContent.trim()) {
        console.warn('Fichier notifications vide');
        return [];
      }

      const notifications = JSON.parse(rawContent) as RoleBasedNotification[];
      console.log(`✅ ${notifications.length} notifications lues depuis le fichier`);
      
      return notifications;
    } catch (error) {
      console.error('Erreur lors de la lecture des notifications:', error);
      return [];
    }
  }

  /**
   * Écrire les notifications dans le fichier JSON
   */
  private static async writeNotifications(notifications: RoleBasedNotification[]): Promise<boolean> {
    try {
      // S'assurer que le dossier existe
      const dir = path.dirname(this.NOTIFICATIONS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Écrire le fichier avec une indentation propre
      const content = JSON.stringify(notifications, null, 2);
      fs.writeFileSync(this.NOTIFICATIONS_FILE, content, 'utf8');
      
      console.log(`✅ ${notifications.length} notifications écrites dans le fichier`);
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'écriture des notifications:', error);
      return false;
    }
  }

  /**
   * Lire les statuts de lecture des notifications
   */
  private static async readReadStatuses(): Promise<NotificationReadStatus[]> {
    try {
      if (!fs.existsSync(this.READ_STATUS_FILE)) {
        return [];
      }

      const rawContent = fs.readFileSync(this.READ_STATUS_FILE, 'utf8');
      if (!rawContent.trim()) {
        return [];
      }

      return JSON.parse(rawContent) as NotificationReadStatus[];
    } catch (error) {
      console.error('Erreur lors de la lecture des statuts de lecture:', error);
      return [];
    }
  }

  /**
   * Écrire les statuts de lecture des notifications
   */
  private static async writeReadStatuses(statuses: NotificationReadStatus[]): Promise<boolean> {
    try {
      const dir = path.dirname(this.READ_STATUS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const content = JSON.stringify(statuses, null, 2);
      fs.writeFileSync(this.READ_STATUS_FILE, content, 'utf8');
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'écriture des statuts de lecture:', error);
      return false;
    }
  }

  /**
   * Lire les préférences de notification par rôle
   */
  private static async readNotificationPreferences(): Promise<any[]> {
    try {
      if (!fs.existsSync(this.PREFERENCES_FILE)) {
        console.warn(`Fichier préférences non trouvé: ${this.PREFERENCES_FILE}`);
        return [];
      }

      const rawContent = fs.readFileSync(this.PREFERENCES_FILE, 'utf8');
      if (!rawContent.trim()) {
        console.warn('Fichier préférences vide');
        return [];
      }

      const preferences = JSON.parse(rawContent);
      console.log(`✅ ${preferences.length} préférences lues depuis le fichier`);
      
      return preferences;
    } catch (error) {
      console.error('Erreur lors de la lecture des préférences:', error);
      return [];
    }
  }

  /**
   * Obtenir les préférences d'un utilisateur selon son rôle
   */
  private static async getUserPreferences(userRole: string): Promise<UserNotificationPreferences> {
    const allPreferences = await this.readNotificationPreferences();
    const userPrefs: UserNotificationPreferences = {};

    // Filtrer les préférences pour le rôle de l'utilisateur
    const rolePreferences = allPreferences.filter(pref => pref.role === userRole);

    rolePreferences.forEach(pref => {
      if (!userPrefs[pref.module]) {
        userPrefs[pref.module] = {};
      }
      userPrefs[pref.module][pref.actionType] = pref.enabled;
    });

    console.log(`✅ Préférences pour le rôle ${userRole}:`, userPrefs);
    return userPrefs;
  }

  /**
   * Obtenir le statut de lecture d'une notification pour un utilisateur
   */
  private static async getReadStatus(notificationId: string, userId: string): Promise<boolean> {
    const readStatuses = await this.readReadStatuses();
    const status = readStatuses.find(s => s.notificationId === notificationId && s.userId === userId);
    return status?.isRead || false;
  }

  /**
   * Vérifier si un utilisateur doit recevoir une notification
   */
  private static shouldUserReceiveNotification(
    notification: RoleBasedNotification,
    userId: string,
    userEmail: string,
    userRole: string,
    userPreferences: UserNotificationPreferences
  ): { should: boolean; reason: 'role' | 'specific'; specificReason?: string } {
    
    // 1. Vérifier si l'utilisateur est spécifiquement mentionné
    if (notification.specificUsers) {
      const specificUser = notification.specificUsers.find(user => 
        user.id === userId || user.email === userEmail
      );
      if (specificUser) {
        return { 
          should: true, 
          reason: 'specific', 
          specificReason: specificUser.reason 
        };
      }
    }

    // 2. Vérifier si l'utilisateur est le créateur (via metadata)
    if (notification.metadata?.createdBy === userId) {
      return { 
        should: true, 
        reason: 'specific', 
        specificReason: 'createdBy' 
      };
    }

    // 3. Vérifier si l'utilisateur est assigné (via metadata)
    if (notification.metadata?.assignedTo?.includes(userId)) {
      return { 
        should: true, 
        reason: 'specific', 
        specificReason: 'assignedTo' 
      };
    }

    // 4. Vérifier selon le rôle et les préférences
    if (notification.targetRoles.includes(userRole)) {
      // Vérifier les préférences utilisateur pour ce module/action
      const modulePrefs = userPreferences[notification.module];
      if (modulePrefs && modulePrefs[notification.actionType] === true) {
        return { should: true, reason: 'role' };
      }
      
      // Si pas de préférence définie, utiliser la valeur par défaut (true pour ADMIN)
      if (!modulePrefs || modulePrefs[notification.actionType] === undefined) {
        const defaultEnabled = userRole === 'ADMIN'; // ADMIN reçoit tout par défaut
        return { should: defaultEnabled, reason: 'role' };
      }
    }

    return { should: false, reason: 'role' };
  }

  /**
   * Récupérer les notifications pour un utilisateur
   */
  static async getNotifications(
    userId: string,
    filters: NotificationFilter = {}
  ): Promise<{ notifications: ExtendedNotification[]; total: number }> {
    try {
      // Récupérer les informations utilisateur depuis la session ou la base
      // Pour l'instant, on assume que ces infos sont disponibles
      const userEmail = filters.userEmail || '';
      const userRole = filters.userRole || 'GUEST';

      console.log(`🔍 Récupération notifications pour:`, {
        userId,
        userEmail,
        userRole,
        filters
      });

      // 1. Lire les notifications et préférences
      const [allNotifications, userPreferences, readStatuses] = await Promise.all([
        this.readNotifications(),
        this.getUserPreferences(userRole),
        this.readReadStatuses()
      ]);

      if (allNotifications.length === 0) {
        return { notifications: [], total: 0 };
      }

      // 2. Filtrer les notifications pour cet utilisateur
      const userNotifications: ExtendedNotification[] = [];

      for (const notification of allNotifications) {
        const { should, reason, specificReason } = this.shouldUserReceiveNotification(
          notification,
          userId,
          userEmail,
          userRole,
          userPreferences
        );

        if (should) {
          // Obtenir le statut de lecture
          const isRead = await this.getReadStatus(notification.id, userId);

          const extendedNotification: ExtendedNotification = {
            id: notification.id,
            userId: userId,
            role: userRole,
            module: notification.module,
            actionType: notification.actionType,
            message: notification.message,
            details: notification.details,
            createdAt: notification.createdAt,
            isRead: isRead,
            severity: notification.severity,
            reason,
            specificReason,
            entityType: notification.metadata?.entityType,
            entityId: notification.metadata?.entityId,
            triggeredBy: notification.metadata?.triggeredBy
          };

          userNotifications.push(extendedNotification);
        }
      }

      // 3. Appliquer les filtres additionnels
      let filteredNotifications = userNotifications;

      if (filters.module) {
        filteredNotifications = filteredNotifications.filter(n => n.module === filters.module);
      }

      if (filters.severity) {
        filteredNotifications = filteredNotifications.filter(n => n.severity === filters.severity);
      }

      if (filters.isRead !== undefined) {
        filteredNotifications = filteredNotifications.filter(n => n.isRead === filters.isRead);
      }

      if (filters.entityType) {
        filteredNotifications = filteredNotifications.filter(n => n.entityType === filters.entityType);
      }

      if (filters.entityId) {
        filteredNotifications = filteredNotifications.filter(n => n.entityId === filters.entityId);
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        filteredNotifications = filteredNotifications.filter(n => new Date(n.createdAt) >= fromDate);
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        filteredNotifications = filteredNotifications.filter(n => new Date(n.createdAt) <= toDate);
      }

      // 4. Trier par date (plus récent en premier)
      const sortedNotifications = filteredNotifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // 5. Appliquer la pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      const paginatedNotifications = sortedNotifications.slice(offset, offset + limit);

      console.log(`✅ Résultat:`, {
        totalFound: userNotifications.length,
        afterFilters: sortedNotifications.length,
        returned: paginatedNotifications.length
      });

      return {
        notifications: paginatedNotifications,
        total: sortedNotifications.length
      };

    } catch (error) {
      console.error('Erreur dans getNotifications:', error);
      return { notifications: [], total: 0 };
    }
  }

  /**
   * Créer une nouvelle notification
   */
  static async createNotification(
    targetRoles: string[],
    module: string,
    actionType: string,
    message: any,
    details: string = '',
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    entityType?: string,
    entityId?: string,
    triggeredBy?: string,
    specificUsers?: Array<{id: string; email: string; reason: string}>
  ): Promise<RoleBasedNotification | null> {
    try {
      console.log(`📝 Création d'une nouvelle notification:`, {
        targetRoles,
        module,
        actionType,
        severity
      });

      // Validation des paramètres
      if (!targetRoles || targetRoles.length === 0) {
        throw new Error('Au moins un rôle cible doit être spécifié');
      }

      if (!module || !actionType || !message) {
        throw new Error('Les champs module, actionType et message sont requis');
      }

      // Créer la nouvelle notification
      const newNotification: RoleBasedNotification = {
        id: uuidv4(),
        targetRoles,
        module,
        actionType,
        message,
        details,
        createdAt: new Date().toISOString(),
        isRead: false,
        severity,
        specificUsers,
        metadata: {
          entityType,
          entityId,
          triggeredBy
        }
      };

      // Lire les notifications existantes
      const existingNotifications = await this.readNotifications();

      // Ajouter la nouvelle notification au début
      const updatedNotifications = [newNotification, ...existingNotifications];

      // Sauvegarder
      const success = await this.writeNotifications(updatedNotifications);

      if (success) {
        console.log(`✅ Notification créée avec succès: ${newNotification.id}`);
        return newNotification;
      } else {
        console.error('❌ Échec de la sauvegarde de la notification');
        return null;
      }

    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error);
      return null;
    }
  }

  /**
   * Obtenir une notification par son ID
   */
  static async getNotificationById(notificationId: string): Promise<RoleBasedNotification | null> {
    try {
      const notifications = await this.readNotifications();
      return notifications.find(n => n.id === notificationId) || null;
    } catch (error) {
      console.error('Erreur lors de la récupération de la notification:', error);
      return null;
    }
  }

  /**
   * Supprimer une notification
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Suppression de la notification: ${notificationId}`);

      const notifications = await this.readNotifications();
      const filteredNotifications = notifications.filter(n => n.id !== notificationId);

      if (filteredNotifications.length === notifications.length) {
        console.warn(`⚠️ Notification non trouvée: ${notificationId}`);
        return false;
      }

      const success = await this.writeNotifications(filteredNotifications);

      if (success) {
        // Supprimer aussi les statuts de lecture associés
        const readStatuses = await this.readReadStatuses();
        const filteredStatuses = readStatuses.filter(s => s.notificationId !== notificationId);
        await this.writeReadStatuses(filteredStatuses);

        console.log(`✅ Notification supprimée: ${notificationId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
      return false;
    }
  }

  /**
   * Marquer une notification comme lue
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      console.log(`👁️ Marquage comme lu: ${notificationId} pour ${userId}`);

      const readStatuses = await this.readReadStatuses();
      
      // Chercher un statut existant
      const existingStatusIndex = readStatuses.findIndex(
        s => s.notificationId === notificationId && s.userId === userId
      );

      if (existingStatusIndex >= 0) {
        // Mettre à jour le statut existant
        readStatuses[existingStatusIndex].isRead = true;
        readStatuses[existingStatusIndex].readAt = new Date().toISOString();
      } else {
        // Créer un nouveau statut
        const newStatus: NotificationReadStatus = {
          id: uuidv4(),
          userId,
          notificationId,
          isRead: true,
          readAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        readStatuses.push(newStatus);
      }

      const success = await this.writeReadStatuses(readStatuses);
      
      if (success) {
        console.log(`✅ Notification marquée comme lue: ${notificationId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
      return false;
    }
  }

  /**
   * Marquer toutes les notifications comme lues pour un utilisateur
   */
  static async markAllAsRead(userId: string, userRole: string, userEmail: string = ''): Promise<boolean> {
    try {
      console.log(`👁️ Marquage de toutes les notifications comme lues pour: ${userId}`);

      // Récupérer toutes les notifications de l'utilisateur
      const { notifications } = await this.getNotifications(userId, { 
        userRole, 
        userEmail, 
        limit: 1000 
      });

      const readStatuses = await this.readReadStatuses();
      let hasChanges = false;

      for (const notification of notifications) {
        if (!notification.isRead) {
          // Chercher un statut existant
          const existingStatusIndex = readStatuses.findIndex(
            s => s.notificationId === notification.id && s.userId === userId
          );

          if (existingStatusIndex >= 0) {
            // Mettre à jour le statut existant
            readStatuses[existingStatusIndex].isRead = true;
            readStatuses[existingStatusIndex].readAt = new Date().toISOString();
          } else {
            // Créer un nouveau statut
            const newStatus: NotificationReadStatus = {
              id: uuidv4(),
              userId,
              notificationId: notification.id,
              isRead: true,
              readAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            };
            readStatuses.push(newStatus);
          }
          hasChanges = true;
        }
      }

      if (hasChanges) {
        const success = await this.writeReadStatuses(readStatuses);
        if (success) {
          console.log(`✅ Toutes les notifications marquées comme lues pour: ${userId}`);
          return true;
        }
      } else {
        console.log(`ℹ️ Aucune notification non lue trouvée pour: ${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erreur lors du marquage de toutes comme lues:', error);
      return false;
    }
  }

  /**
   * Récupérer les statistiques pour un utilisateur
   */
  static async getStats(
    userId: string,
    userRole: string,
    userEmail: string = '',
    filters: {
      module?: string;
      severity?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<NotificationStats> {
    try {
      console.log(`📊 Calcul des stats pour:`, { userId, userRole });

      // Récupérer toutes les notifications de l'utilisateur
      const { notifications } = await this.getNotifications(userId, {
        userRole,
        userEmail,
        limit: 1000, // Limite élevée pour avoir toutes les notifications
        ...filters
      });

      // Calculer les statistiques
      const stats: NotificationStats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.isRead).length,
        byModule: {},
        bySeverity: {},
        byReason: {}
      };

      notifications.forEach(notification => {
        // Par module
        stats.byModule[notification.module] = (stats.byModule[notification.module] || 0) + 1;
        
        // Par sévérité
        stats.bySeverity[notification.severity] = (stats.bySeverity[notification.severity] || 0) + 1;
        
        // Par raison
        stats.byReason[notification.reason] = (stats.byReason[notification.reason] || 0) + 1;
      });

      console.log(`✅ Stats calculées:`, stats);
      return stats;

    } catch (error) {
      console.error('Erreur dans getStats:', error);
      return {
        total: 0,
        unread: 0,
        byModule: {},
        bySeverity: {},
        byReason: {}
      };
    }
  }

  /**
   * Créer une notification de test pour un rôle spécifique
   */
  static generateTestNotificationForRole(
    targetRoles: string[],
    module: string = 'SYSTEM',
    actionType: string = 'TEST',
    specificUserId?: string
  ): RoleBasedNotification {
    const notification: RoleBasedNotification = {
      id: `test_${Date.now()}`,
      targetRoles,
      module,
      actionType,
      message: {
        fr: `Notification de test pour les rôles: ${targetRoles.join(', ')}`,
        en: `Test notification for roles: ${targetRoles.join(', ')}`
      },
      details: 'Ceci est une notification de test générée automatiquement pour tester le système basé sur les rôles',
      createdAt: new Date().toISOString(),
      isRead: false,
      severity: 'low',
      metadata: {
        entityType: 'test',
        createdBy: specificUserId
      }
    };

    // Si un utilisateur spécifique est fourni, l'ajouter aussi
    if (specificUserId) {
      notification.specificUsers = [{
        id: specificUserId,
        email: '', // À remplir selon le contexte
        reason: 'createdBy'
      }];
    }

    return notification;
  }
}