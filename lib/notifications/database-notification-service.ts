// lib/notifications/database-notification-service.ts
import { v4 as uuidv4 } from 'uuid';
import { query } from '@/lib/db';
import { NotificationFilter, ExtendedNotification, NotificationStats } from '@/types/notifications';

interface DatabaseNotification {
  id: string;
  user_id: string;
  user_role: string;
  target_roles: string | null; // JSON string
  module: string;
  action_type: string;
  message: string; // JSON string
  details: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  entity_type: string | null;
  entity_id: string | null;
  triggered_by: string | null;
  reason: 'role' | 'specific';
  specific_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

interface NotificationPreference {
  user_id: string;
  user_role: string;
  module: string;
  action_type: string;
  enabled: boolean;
}

export class DatabaseNotificationService {
  private static readonly MODULES = [
    'USERS', 'CHEMICALS', 'EQUIPMENT', 'ROOMS', 'CALENDAR', 'ORDERS', 'SECURITY', 'SYSTEM'
  ];

  private static readonly ROLES = [
    'ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN', 'GUEST'
  ];

  /**
   * Créer une nouvelle notification basée sur les rôles
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
  ): Promise<string | null> {
    try {
      const notificationId = uuidv4();
      
      // Valider les paramètres
      if (!targetRoles || targetRoles.length === 0) {
        throw new Error('Au moins un rôle cible doit être spécifié');
      }

      if (!module || !actionType || !message) {
        throw new Error('Les champs module, actionType et message sont requis');
      }

      // Insérer la notification principale
      await query(
        `INSERT INTO notifications (
          id, user_id, user_role, target_roles, module, action_type, 
          message, details, severity, entity_type, entity_id, triggered_by,
          reason, created_at, updated_at
        ) VALUES (?, '', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'role', NOW(), NOW())`,
        [
          notificationId,
          JSON.stringify(targetRoles),
          module,
          actionType,
          JSON.stringify(message),
          details,
          severity,
          entityType,
          entityId,
          triggeredBy
        ]
      );

      
      return notificationId;

    } catch (error) {
      console.error('❌ [DatabaseService] Erreur lors de la création:', error);
      return null;
    }
  }

  /**
   * Récupérer les notifications pour un utilisateur
   */
  static async getNotifications(
    userId: string,
    filters: NotificationFilter = {}
  ): Promise<{ notifications: ExtendedNotification[]; total: number }> {
    try {
      const userEmail = filters.userEmail || '';
      const userRole = filters.userRole || 'GUEST';

      // Construire la requête SQL avec les filtres
      let whereClauses = [];
      let params: any[] = [];

      // Filtrer par rôle - les notifications qui ciblent ce rôle
      // Utiliser JSON_SEARCH au lieu de JSON_CONTAINS pour plus de compatibilité
      whereClauses.push(`(
        JSON_SEARCH(target_roles, 'one', ?) IS NOT NULL OR 
        target_roles IS NULL OR 
        target_roles = ''
      )`);
      params.push(userRole);

      // Ajouter les filtres optionnels
      if (filters.module) {
        whereClauses.push('module = ?');
        params.push(filters.module);
      }

      if (filters.severity) {
        whereClauses.push('severity = ?');
        params.push(filters.severity);
      }

      if (filters.dateFrom) {
        whereClauses.push('created_at >= ?');
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        whereClauses.push('created_at <= ?');
        params.push(filters.dateTo + ' 23:59:59');
      }

      if (filters.entityType) {
        whereClauses.push('entity_type = ?');
        params.push(filters.entityType);
      }

      if (filters.entityId) {
        whereClauses.push('entity_id = ?');
        params.push(filters.entityId);
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Compter le total
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM notifications 
        ${whereClause}
      `;
      
      const [countResult] = await query<{total: number}[]>(countQuery, params);
      const total = countResult?.total || 0;

      // Récupérer les notifications avec pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      const selectQuery = `
        SELECT 
          id, user_id, user_role, target_roles, module, action_type,
          message, details, severity, is_read, entity_type, entity_id,
          triggered_by, reason, specific_reason, created_at, updated_at
        FROM notifications 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const notifications = await query<DatabaseNotification[]>(
        selectQuery, 
        params
      );

      

      // Convertir en format ExtendedNotification
      const extendedNotifications: ExtendedNotification[] = await Promise.all(
        notifications.map(async (dbNotif) => {
          // Vérifier le statut de lecture pour cet utilisateur
          const isRead = await this.getReadStatus(dbNotif.id, userId);

          let parsedMessage;
          try {
            parsedMessage = typeof dbNotif.message === 'string' ? JSON.parse(dbNotif.message) : dbNotif.message;
          } catch {
            parsedMessage = { fr: dbNotif.message, en: dbNotif.message };
          }

          return {
            id: dbNotif.id,
            userId: userId,
            role: userRole,
            module: dbNotif.module,
            actionType: dbNotif.action_type,
            message: parsedMessage,
            details: dbNotif.details || '',
            createdAt: dbNotif.created_at.toISOString(),
            isRead: isRead,
            severity: dbNotif.severity,
            reason: dbNotif.reason,
            specificReason: dbNotif.specific_reason || undefined,
            entityType: dbNotif.entity_type || undefined,
            entityId: dbNotif.entity_id || undefined,
            triggeredBy: dbNotif.triggered_by || undefined
          };
        })
      );

      // Appliquer le filtre isRead après conversion
      let filteredNotifications = extendedNotifications;
      if (filters.isRead !== undefined) {
        filteredNotifications = filteredNotifications.filter(n => n.isRead === filters.isRead);
      }

      return {
        notifications: filteredNotifications,
        total: total
      };

    } catch (error) {
      console.error('❌ [DatabaseService] Erreur lors de la récupération:', error);
      return { notifications: [], total: 0 };
    }
  }

  /**
   * Obtenir le statut de lecture d'une notification pour un utilisateur
   */
  static async getReadStatus(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await query<{is_read: boolean}[]>(
        'SELECT is_read FROM notification_read_status WHERE notification_id = ? AND user_id = ?',
        [notificationId, userId]
      );

      return result.length > 0 ? result[0].is_read : false;
    } catch (error) {
      console.error('❌ [DatabaseService] Erreur getReadStatus:', error);
      return false;
    }
  }

  /**
   * Marquer une notification comme lue
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      // Utiliser INSERT ... ON DUPLICATE KEY UPDATE pour gérer les deux cas
      await query(
        `INSERT INTO notification_read_status (notification_id, user_id, is_read, read_at, created_at, updated_at)
         VALUES (?, ?, TRUE, NOW(), NOW(), NOW())
         ON DUPLICATE KEY UPDATE is_read = TRUE, read_at = NOW(), updated_at = NOW()`,
        [notificationId, userId]
      );

      
      return true;
    } catch (error) {
      console.error('❌ [DatabaseService] Erreur markAsRead:', error);
      return false;
    }
  }

  /**
   * Marquer toutes les notifications comme lues pour un utilisateur
   */
  static async markAllAsRead(userId: string, userRole: string): Promise<boolean> {
    try {
      // Récupérer toutes les notifications non lues pour cet utilisateur
      const notifications = await query<{id: string}[]>(
        `SELECT id FROM notifications 
         WHERE JSON_CONTAINS(target_roles, ?) OR target_roles IS NULL OR target_roles = ''`,
        [`"${userRole}"`]
      );

      // Marquer chacune comme lue
      for (const notif of notifications) {
        await this.markAsRead(notif.id, userId);
      }

      
      return true;
    } catch (error) {
      console.error('❌ [DatabaseService] Erreur markAllAsRead:', error);
      return false;
    }
  }

  /**
   * Obtenir les statistiques des notifications
   */
  static async getStats(userId: string, userRole: string, filters: Partial<NotificationFilter> = {}): Promise<NotificationStats> {
    try {
      // Construire les clauses WHERE pour les filtres
      let whereClauses = [`(JSON_CONTAINS(target_roles, ?) OR target_roles IS NULL OR target_roles = '')`];
      let params: any[] = [`"${userRole}"`];

      if (filters.module) {
        whereClauses.push('module = ?');
        params.push(filters.module);
      }

      if (filters.severity) {
        whereClauses.push('severity = ?');
        params.push(filters.severity);
      }

      if (filters.dateFrom) {
        whereClauses.push('created_at >= ?');
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        whereClauses.push('created_at <= ?');
        params.push(filters.dateTo + ' 23:59:59');
      }

      const whereClause = `WHERE ${whereClauses.join(' AND ')}`;

      // Statistiques générales
      const [totalResult] = await query<{total: number}[]>(
        `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
        params
      );

      // Statistiques par module
      const moduleStats = await query<{module: string, count: number}[]>(
        `SELECT module, COUNT(*) as count FROM notifications ${whereClause} GROUP BY module`,
        params
      );

      // Statistiques par sévérité
      const severityStats = await query<{severity: string, count: number}[]>(
        `SELECT severity, COUNT(*) as count FROM notifications ${whereClause} GROUP BY severity`,
        params
      );

      // Compter les non lues (plus complexe car il faut joindre avec notification_read_status)
      const [unreadResult] = await query<{unread: number}[]>(
        `SELECT COUNT(*) as unread
         FROM notifications n
         LEFT JOIN notification_read_status nrs ON n.id = nrs.notification_id AND nrs.user_id = ?
         ${whereClause.replace('WHERE', 'WHERE')} AND (nrs.is_read IS NULL OR nrs.is_read = FALSE)`,
        [userId, ...params]
      );

      const stats: NotificationStats = {
        total: totalResult?.total || 0,
        unread: unreadResult?.unread || 0,
        byModule: {},
        bySeverity: {},
        byReason: { role: totalResult?.total || 0, specific: 0 } // Simplifié pour l'instant
      };

      // Remplir les statistiques par module
      moduleStats.forEach(stat => {
        stats.byModule[stat.module] = stat.count;
      });

      // Remplir les statistiques par sévérité
      severityStats.forEach(stat => {
        stats.bySeverity[stat.severity] = stat.count;
      });

      return stats;

    } catch (error) {
      console.error('❌ [DatabaseService] Erreur getStats:', error);
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
   * Obtenir les préférences de notification d'un utilisateur
   */
  static async getUserPreferences(userId: string, userRole: string): Promise<Record<string, Record<string, boolean>>> {
    try {
      const preferences = await query<NotificationPreference[]>(
        'SELECT module, action_type, enabled FROM notification_preferences WHERE user_id = ? OR user_role = ?',
        [userId, userRole]
      );

      const result: Record<string, Record<string, boolean>> = {};
      
      preferences.forEach(pref => {
        if (!result[pref.module]) {
          result[pref.module] = {};
        }
        result[pref.module][pref.action_type] = pref.enabled;
      });

      return result;
    } catch (error) {
      console.error('❌ [DatabaseService] Erreur getUserPreferences:', error);
      return {};
    }
  }

  /**
   * Initialiser les préférences par défaut pour un utilisateur
   */
  static async initializeDefaultPreferences(userId: string, userRole: string): Promise<void> {
    try {
      const actions = ['CREATE', 'UPDATE', 'DELETE', 'READ'];
      const defaultEnabled = userRole === 'ADMIN'; // Admin reçoit tout par défaut

      for (const module of this.MODULES) {
        for (const action of actions) {
          await query(
            `INSERT IGNORE INTO notification_preferences 
             (user_id, user_role, module, action_type, enabled, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [userId, userRole, module, action, defaultEnabled]
          );
        }
      }

      
    } catch (error) {
      console.error('❌ [DatabaseService] Erreur initializeDefaultPreferences:', error);
    }
  }
}
