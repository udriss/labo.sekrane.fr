// lib/debug/notifications-file-debug.ts

import fs from 'fs';
import path from 'path';

interface NotificationUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface FileNotification {
  id: string;
  userId: NotificationUser[]; // Array d'utilisateurs
  role: string;
  module: string;
  actionType: any;
  message: any;
  details: string;
  createdAt: string;
  isRead: boolean;
  severity: string;
}

interface FileDebugResult {
  success: boolean;
  error?: string;
  fileExists?: boolean;
  fileSize?: number;
  rawContent?: string;
  parsedContent?: FileNotification[];
  filteredForUser?: FileNotification[];
  stats?: {
    totalNotifications: number;
    notificationsForUser: number;
    userMatches: Array<{
      notificationId: string;
      matchedUsers: NotificationUser[];
    }>;
  };
}

export class NotificationsFileDebugService {
  private static readonly FILE_PATH = '/var/www/labo.sekrane.fr/data/notifications.json';
  
  /**
   * Test complet de lecture du fichier notifications.json
   */
  static async debugFileAccess(userId?: string, userEmail?: string): Promise<FileDebugResult> {
    try {
      
      
      
      

      // 1. Vérifier l'existence du fichier
      const fileExists = fs.existsSync(this.FILE_PATH);
      
      
      if (!fileExists) {
        return {
          success: false,
          error: `Fichier non trouvé: ${this.FILE_PATH}`,
          fileExists: false
        };
      }

      // 2. Lire les stats du fichier
      const stats = fs.statSync(this.FILE_PATH);
      const fileSize = stats.size;
      

      if (fileSize === 0) {
        return {
          success: false,
          error: 'Fichier vide',
          fileExists: true,
          fileSize: 0
        };
      }

      // 3. Lire le contenu brut
      const rawContent = fs.readFileSync(this.FILE_PATH, 'utf8');
      
      

      // 4. Parser le JSON
      let parsedContent: FileNotification[];
      try {
        parsedContent = JSON.parse(rawContent);
        
        
      } catch (parseError) {
        console.error('🔍 [DEBUG] Erreur de parsing JSON:', parseError);
        return {
          success: false,
          error: `Erreur de parsing JSON: ${parseError}`,
          fileExists: true,
          fileSize,
          rawContent: rawContent.substring(0, 500) // Premiers 500 caractères pour debug
        };
      }

      // 5. Analyser la structure
      if (parsedContent.length > 0) {
        const firstNotif = parsedContent[0];
        
        
        
        
        
        
        
      }

      // 6. Filtrer pour l'utilisateur spécifique (si fourni)
      let filteredForUser: FileNotification[] = [];
      let userMatches: Array<{notificationId: string; matchedUsers: NotificationUser[]}> = [];

      if (userId || userEmail) {
        
        
        filteredForUser = parsedContent.filter(notification => {
          if (!Array.isArray(notification.userId)) {
            
            return false;
          }

          const matchedUsers = notification.userId.filter(user => {
            const idMatch = userId && user.id === userId;
            const emailMatch = userEmail && user.email === userEmail;
            return idMatch || emailMatch;
          });

          if (matchedUsers.length > 0) {
            userMatches.push({
              notificationId: notification.id,
              matchedUsers
            });
            
            return true;
          }

          return false;
        });

        
      }

      return {
        success: true,
        fileExists: true,
        fileSize,
        rawContent: rawContent.substring(0, 1000), // Premiers 1000 caractères
        parsedContent,
        filteredForUser,
        stats: {
          totalNotifications: parsedContent.length,
          notificationsForUser: filteredForUser.length,
          userMatches
        }
      };

    } catch (error) {
      console.error('🔍 [DEBUG] Erreur générale:', error);
      return {
        success: false,
        error: `Erreur générale: ${error}`
      };
    }
  }

  /**
   * Test de lecture avec différents formats d'userId
   */
  static async testUserIdFormats(testUserId: string, testUserEmail: string): Promise<any> {
    const result = await this.debugFileAccess(testUserId, testUserEmail);
    
    if (!result.success || !result.parsedContent) {
      return { error: 'Impossible de lire le fichier' };
    }

    const tests = {
      byId: 0,
      byEmail: 0,
      byIdAndEmail: 0,
      invalidStructure: 0,
      examples: [] as any[]
    };

    result.parsedContent.forEach(notification => {
      if (!Array.isArray(notification.userId)) {
        tests.invalidStructure++;
        return;
      }

      const hasIdMatch = notification.userId.some(user => user.id === testUserId);
      const hasEmailMatch = notification.userId.some(user => user.email === testUserEmail);

      if (hasIdMatch) tests.byId++;
      if (hasEmailMatch) tests.byEmail++;
      if (hasIdMatch && hasEmailMatch) tests.byIdAndEmail++;

      // Garder quelques exemples
      if (tests.examples.length < 3) {
        tests.examples.push({
          notificationId: notification.id,
          users: notification.userId,
          hasIdMatch,
          hasEmailMatch
        });
      }
    });

    return tests;
  }

  /**
   * Corriger le service de notifications existant
   */
  static async getNotificationsForUser(
    userId: string, 
    userEmail?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<FileNotification[]> {
    try {
      const debugResult = await this.debugFileAccess(userId, userEmail);
      
      if (!debugResult.success || !debugResult.filteredForUser) {
        console.error('Erreur lors de la lecture des notifications:', debugResult.error);
        return [];
      }

      // Trier par date (plus récent en premier)
      const sorted = debugResult.filteredForUser.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Appliquer pagination
      return sorted.slice(offset, offset + limit);

    } catch (error) {
      console.error('Erreur dans getNotificationsForUser:', error);
      return [];
    }
  }

  /**
   * Obtenir les statistiques pour un utilisateur
   */
  static async getStatsForUser(userId: string, userEmail?: string): Promise<any> {
    try {
      const debugResult = await this.debugFileAccess(userId, userEmail);
      
      if (!debugResult.success || !debugResult.filteredForUser) {
        return {
          total: 0,
          unread: 0,
          byModule: {},
          bySeverity: {}
        };
      }

      const notifications = debugResult.filteredForUser;
      const unread = notifications.filter(n => !n.isRead).length;
      
      const byModule: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};

      notifications.forEach(notification => {
        // Par module
        byModule[notification.module] = (byModule[notification.module] || 0) + 1;
        
        // Par sévérité
        bySeverity[notification.severity] = (bySeverity[notification.severity] || 0) + 1;
      });

      return {
        total: notifications.length,
        unread,
        byModule,
        bySeverity
      };

    } catch (error) {
      console.error('Erreur dans getStatsForUser:', error);
      return {
        total: 0,
        unread: 0,
        byModule: {},
        bySeverity: {}
      };
    }
  }
}