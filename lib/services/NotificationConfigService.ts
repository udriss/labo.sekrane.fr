import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

export interface NotificationConfig {
  id: string;
  module: string;
  actionType: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  defaultRoles: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: number;
  userId: string;
  userRole: string;
  module: string;
  actionType: string;
  enabled: boolean;
  customSettings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationHistoryEntry {
  id: string;
  configId: string;
  recipientUserId: string;
  recipientRole: string;
  title: string;
  message: Record<string, string>;
  details?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  deliveryChannel: 'in_app' | 'email' | 'sms' | 'push';
  metadata?: Record<string, any>;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Configurations par défaut
const DEFAULT_NOTIFICATION_CONFIGS: Omit<NotificationConfig, 'createdAt' | 'updatedAt'>[] = [
  // Module USERS
  {
    id: 'users_new_registration',
    module: 'USERS',
    actionType: 'NEW_USER_REGISTRATION',
    name: 'Nouvelle inscription utilisateur',
    description: 'Notification envoyée lors de l\'inscription d\'un nouvel utilisateur nécessitant une validation',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO']
  },
  {
    id: 'users_account_activated',
    module: 'USERS',
    actionType: 'ACCOUNT_ACTIVATED',
    name: 'Compte utilisateur activé',
    description: 'Notification envoyée lorsqu\'un compte utilisateur est activé par un administrateur',
    severity: 'low',
    enabled: true,
    defaultRoles: ['ADMIN']
  },
  {
    id: 'users_role_changed',
    module: 'USERS',
    actionType: 'ROLE_CHANGED',
    name: 'Rôle utilisateur modifié',
    description: 'Notification envoyée lorsque le rôle d\'un utilisateur est modifié',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMIN']
  },
  {
    id: 'users_create',
    module: 'USERS',
    actionType: 'CREATE',
    name: 'Création utilisateur',
    description: 'Notification lors de la création d\'un utilisateur',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMIN']
  },
  {
    id: 'users_update',
    module: 'USERS',
    actionType: 'UPDATE',
    name: 'Modification utilisateur',
    description: 'Notification lors de la modification d\'un utilisateur',
    severity: 'low',
    enabled: true,
    defaultRoles: ['ADMIN']
  },
  {
    id: 'users_delete',
    module: 'USERS',
    actionType: 'DELETE',
    name: 'Suppression utilisateur',
    description: 'Notification lors de la suppression d\'un utilisateur',
    severity: 'high',
    enabled: true,
    defaultRoles: ['ADMIN']
  },

  // Module CHEMICALS
  {
    id: 'chemicals_stock_low',
    module: 'CHEMICALS',
    actionType: 'STOCK_LOW',
    name: 'Stock faible de produit chimique',
    description: 'Notification envoyée lorsque le stock d\'un produit chimique est en dessous du seuil minimum',
    severity: 'high',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO', 'LABORANTIN']
  },
  {
    id: 'chemicals_expiry_warning',
    module: 'CHEMICALS',
    actionType: 'EXPIRY_WARNING',
    name: 'Produit chimique bientôt périmé',
    description: 'Notification envoyée lorsqu\'un produit chimique approche de sa date d\'expiration',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMINLABO', 'LABORANTIN']
  },
  {
    id: 'chemicals_new_arrival',
    module: 'CHEMICALS',
    actionType: 'NEW_ARRIVAL',
    name: 'Nouveau produit chimique ajouté',
    description: 'Notification envoyée lorsqu\'un nouveau produit chimique est ajouté à l\'inventaire',
    severity: 'low',
    enabled: true,
    defaultRoles: ['ADMINLABO', 'LABORANTIN']
  },
  {
    id: 'chemicals_create',
    module: 'CHEMICALS',
    actionType: 'CREATE',
    name: 'Création produit chimique',
    description: 'Notification lors de la création d\'un produit chimique',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMINLABO']
  },
  {
    id: 'chemicals_update',
    module: 'CHEMICALS',
    actionType: 'UPDATE',
    name: 'Modification produit chimique',
    description: 'Notification lors de la modification d\'un produit chimique',
    severity: 'low',
    enabled: true,
    defaultRoles: ['ADMINLABO']
  },
  {
    id: 'chemicals_delete',
    module: 'CHEMICALS',
    actionType: 'DELETE',
    name: 'Suppression produit chimique',
    description: 'Notification lors de la suppression d\'un produit chimique',
    severity: 'high',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO']
  },

  // Module EQUIPMENT
  {
    id: 'equipment_maintenance_due',
    module: 'EQUIPMENT',
    actionType: 'MAINTENANCE_DUE',
    name: 'Maintenance d\'équipement requise',
    description: 'Notification envoyée lorsqu\'un équipement nécessite une maintenance préventive',
    severity: 'high',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO', 'LABORANTIN']
  },
  {
    id: 'equipment_malfunction',
    module: 'EQUIPMENT',
    actionType: 'MALFUNCTION',
    name: 'Dysfonctionnement d\'équipement',
    description: 'Notification envoyée lorsqu\'un équipement présente un dysfonctionnement',
    severity: 'critical',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO', 'LABORANTIN']
  },
  {
    id: 'equipment_calibration_due',
    module: 'EQUIPMENT',
    actionType: 'CALIBRATION_DUE',
    name: 'Calibration d\'équipement requise',
    description: 'Notification envoyée lorsqu\'un équipement nécessite une calibration',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMINLABO', 'LABORANTIN']
  },
  {
    id: 'equipment_create',
    module: 'EQUIPMENT',
    actionType: 'CREATE',
    name: 'Création équipement',
    description: 'Notification lors de la création d\'un équipement',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO']
  },
  {
    id: 'equipment_update',
    module: 'EQUIPMENT',
    actionType: 'UPDATE',
    name: 'Modification équipement',
    description: 'Notification lors de la modification d\'un équipement',
    severity: 'low',
    enabled: true,
    defaultRoles: ['ADMINLABO']
  },
  {
    id: 'equipment_delete',
    module: 'EQUIPMENT',
    actionType: 'DELETE',
    name: 'Suppression équipement',
    description: 'Notification lors de la suppression d\'un équipement',
    severity: 'high',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO']
  },

  // Module ROOMS
  {
    id: 'rooms_room_reserved',
    module: 'ROOMS',
    actionType: 'ROOM_RESERVED',
    name: 'Salle réservée',
    description: 'Notification envoyée lorsqu\'une salle est réservée',
    severity: 'low',
    enabled: true,
    defaultRoles: ['TEACHER', 'LABORANTIN']
  },
  {
    id: 'rooms_booking_conflict',
    module: 'ROOMS',
    actionType: 'BOOKING_CONFLICT',
    name: 'Conflit de réservation',
    description: 'Notification envoyée en cas de conflit de réservation de salle',
    severity: 'high',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO', 'TEACHER']
  },
  {
    id: 'rooms_maintenance_scheduled',
    module: 'ROOMS',
    actionType: 'MAINTENANCE_SCHEDULED',
    name: 'Maintenance de salle programmée',
    description: 'Notification envoyée lorsqu\'une maintenance de salle est programmée',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO', 'LABORANTIN']
  },
  {
    id: 'rooms_create',
    module: 'ROOMS',
    actionType: 'CREATE',
    name: 'Création salle',
    description: 'Notification lors de la création d\'une salle',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO']
  },
  {
    id: 'rooms_update',
    module: 'ROOMS',
    actionType: 'UPDATE',
    name: 'Modification salle',
    description: 'Notification lors de la modification d\'une salle',
    severity: 'low',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO']
  },
  {
    id: 'rooms_delete',
    module: 'ROOMS',
    actionType: 'DELETE',
    name: 'Suppression salle',
    description: 'Notification lors de la suppression d\'une salle',
    severity: 'high',
    enabled: true,
    defaultRoles: ['ADMIN']
  },

  // Module CALENDAR
  {
    id: 'calendar_event_created',
    module: 'CALENDAR',
    actionType: 'EVENT_CREATED',
    name: 'Événement créé',
    description: 'Notification envoyée lorsqu\'un nouvel événement est créé',
    severity: 'low',
    enabled: true,
    defaultRoles: ['ADMIN', 'TEACHER']
  },
  {
    id: 'calendar_event_modified',
    module: 'CALENDAR',
    actionType: 'EVENT_MODIFIED',
    name: 'Événement modifié',
    description: 'Notification envoyée lorsqu\'un événement existant est modifié',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMIN', 'TEACHER']
  },
  {
    id: 'calendar_event_reminder',
    module: 'CALENDAR',
    actionType: 'EVENT_REMINDER',
    name: 'Rappel d\'événement',
    description: 'Notification de rappel envoyée avant un événement',
    severity: 'low',
    enabled: true,
    defaultRoles: ['TEACHER']
  },
  {
    id: 'calendar_validate_event',
    module: 'CALENDAR',
    actionType: 'VALIDATE_EVENT',
    name: 'Validation événement',
    description: 'Notification lors de la validation d\'un événement',
    severity: 'high',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO']
  },
  {
    id: 'calendar_create',
    module: 'CALENDAR',
    actionType: 'CREATE',
    name: 'Création événement',
    description: 'Notification lors de la création d\'un événement',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMIN', 'TEACHER']
  },
  {
    id: 'calendar_update',
    module: 'CALENDAR',
    actionType: 'UPDATE',
    name: 'Modification événement',
    description: 'Notification lors de la modification d\'un événement',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMIN', 'TEACHER']
  },

  // Module ORDERS
  {
    id: 'orders_order_delivered',
    module: 'ORDERS',
    actionType: 'ORDER_DELIVERED',
    name: 'Commande livrée',
    description: 'Notification envoyée lorsqu\'une commande est livrée',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO']
  },
  {
    id: 'orders_order_delayed',
    module: 'ORDERS',
    actionType: 'ORDER_DELAYED',
    name: 'Commande retardée',
    description: 'Notification envoyée lorsqu\'une commande est retardée',
    severity: 'high',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO']
  },
  {
    id: 'orders_order_approved',
    module: 'ORDERS',
    actionType: 'ORDER_APPROVED',
    name: 'Commande approuvée',
    description: 'Notification envoyée lorsqu\'une commande est approuvée',
    severity: 'low',
    enabled: true,
    defaultRoles: ['ADMINLABO']
  },
  {
    id: 'orders_create',
    module: 'ORDERS',
    actionType: 'CREATE',
    name: 'Création commande',
    description: 'Notification lors de la création d\'une commande',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO']
  },
  {
    id: 'orders_update',
    module: 'ORDERS',
    actionType: 'UPDATE',
    name: 'Modification commande',
    description: 'Notification lors de la modification d\'une commande',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMIN', 'ADMINLABO']
  },

  // Module SECURITY
  {
    id: 'security_security_alert',
    module: 'SECURITY',
    actionType: 'SECURITY_ALERT',
    name: 'Alerte de sécurité',
    description: 'Notification envoyée en cas d\'incident de sécurité',
    severity: 'critical',
    enabled: true,
    defaultRoles: ['ADMIN']
  },
  {
    id: 'security_access_denied',
    module: 'SECURITY',
    actionType: 'ACCESS_DENIED',
    name: 'Accès refusé',
    description: 'Notification envoyée lors d\'une tentative d\'accès non autorisé',
    severity: 'high',
    enabled: true,
    defaultRoles: ['ADMIN']
  },
  {
    id: 'security_suspicious_login',
    module: 'SECURITY',
    actionType: 'SUSPICIOUS_LOGIN',
    name: 'Connexion suspecte',
    description: 'Notification envoyée lors d\'une connexion depuis un lieu inhabituel',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMIN']
  },
  {
    id: 'security_login',
    module: 'SECURITY',
    actionType: 'LOGIN',
    name: 'Connexion utilisateur',
    description: 'Notification lors de la connexion d\'un utilisateur',
    severity: 'low',
    enabled: true,
    defaultRoles: []
  },
  {
    id: 'security_logout',
    module: 'SECURITY',
    actionType: 'LOGOUT',
    name: 'Déconnexion utilisateur',
    description: 'Notification lors de la déconnexion d\'un utilisateur',
    severity: 'low',
    enabled: true,
    defaultRoles: []
  },

  // Module SYSTEM
  {
    id: 'system_maintenance',
    module: 'SYSTEM',
    actionType: 'MAINTENANCE',
    name: 'Maintenance système',
    description: 'Notification envoyée lors d\'une maintenance système programmée',
    severity: 'high',
    enabled: true,
    defaultRoles: ['ADMIN']
  },
  {
    id: 'system_backup_completed',
    module: 'SYSTEM',
    actionType: 'BACKUP_COMPLETED',
    name: 'Sauvegarde terminée',
    description: 'Notification envoyée lorsqu\'une sauvegarde système est terminée',
    severity: 'low',
    enabled: true,
    defaultRoles: ['ADMIN']
  },
  {
    id: 'system_update_available',
    module: 'SYSTEM',
    actionType: 'UPDATE_AVAILABLE',
    name: 'Mise à jour disponible',
    description: 'Notification envoyée lorsqu\'une mise à jour système est disponible',
    severity: 'medium',
    enabled: true,
    defaultRoles: ['ADMIN']
  },
  {
    id: 'system_error',
    module: 'SYSTEM',
    actionType: 'ERROR',
    name: 'Erreur système',
    description: 'Notification lors d\'erreurs système',
    severity: 'critical',
    enabled: true,
    defaultRoles: ['ADMIN']
  }
];

export class NotificationConfigService {
  private connection: mysql.Connection | null = null;

  private async getConnection(): Promise<mysql.Connection> {
    if (!this.connection) {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        charset: 'utf8mb4',
      });
    }
    return this.connection;
  }

  async closeConnection(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  // ========== GESTION DES CONFIGURATIONS ==========

  async getAllConfigs(): Promise<NotificationConfig[]> {

    const connection = await this.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        id,
        module,
        action_type as actionType,
        name,
        description,
        severity,
        enabled,
        default_roles as defaultRoles,
        metadata,
        created_at as createdAt,
        updated_at as updatedAt
      FROM notification_configs
      ORDER BY module, action_type
    `);

    return (rows as any[]).map(row => {
      let defaultRoles;
      try {
        defaultRoles = JSON.parse(row.defaultRoles || '[]');
      } catch (error) {
        console.error(`Invalid JSON in defaultRoles for config ID ${row.id}:`, row.defaultRoles);
        defaultRoles = [];
      }

      return {
        ...row,
        defaultRoles,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      };
    });
  }

  async getConfigById(id: string): Promise<NotificationConfig | null> {
    
    const connection = await this.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        id,
        module,
        action_type as actionType,
        name,
        description,
        severity,
        enabled,
        default_roles as defaultRoles,
        metadata,
        created_at as createdAt,
        updated_at as updatedAt
      FROM notification_configs
      WHERE id = ?
    `, [id]);

    const result = rows as any[];
    if (result.length === 0) return null;

    const row = result[0];
    return {
      ...row,
      defaultRoles: JSON.parse(row.defaultRoles || '[]'),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  async getConfigsByModule(module: string): Promise<NotificationConfig[]> {
    const connection = await this.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        id,
        module,
        action_type as actionType,
        name,
        description,
        severity,
        enabled,
        default_roles as defaultRoles,
        metadata,
        created_at as createdAt,
        updated_at as updatedAt
      FROM notification_configs
      WHERE module = ?
      ORDER BY action_type
    `, [module]);

    return (rows as any[]).map(row => ({
      ...row,
      defaultRoles: JSON.parse(row.defaultRoles || '[]'),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  async createConfig(config: Omit<NotificationConfig, 'createdAt' | 'updatedAt'>): Promise<NotificationConfig> {
    const connection = await this.getConnection();

    // Convertir les dates au format MySQL
    const now = new Date();
    const formattedNow = now.toISOString().slice(0, 19).replace('T', ' ');

    await connection.execute(`
      INSERT INTO notification_configs (
        id, module, action_type, name, description, severity, enabled, 
        default_roles, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      config.id,
      config.module,
      config.actionType,
      config.name,
      config.description,
      config.severity,
      config.enabled,
      JSON.stringify(config.defaultRoles),
      config.metadata ? JSON.stringify(config.metadata) : null,
      formattedNow,
      formattedNow
    ]);

    return {
      ...config,
      createdAt: formattedNow,
      updatedAt: formattedNow
    };
  }

  async updateConfig(id: string, updates: Partial<Omit<NotificationConfig, 'id' | 'createdAt' | 'updatedAt'>>): Promise<NotificationConfig | null> {
    const connection = await this.getConnection();
    const now = new Date().toISOString();

    const setParts: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      setParts.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setParts.push('description = ?');
      values.push(updates.description);
    }
    if (updates.severity !== undefined) {
      setParts.push('severity = ?');
      values.push(updates.severity);
    }
    if (updates.enabled !== undefined) {
      setParts.push('enabled = ?');
      values.push(updates.enabled);
    }
    if (updates.defaultRoles !== undefined) {
      setParts.push('default_roles = ?');
      values.push(JSON.stringify(updates.defaultRoles));
    }
    if (updates.metadata !== undefined) {
      setParts.push('metadata = ?');
      values.push(updates.metadata ? JSON.stringify(updates.metadata) : null);
    }

    if (setParts.length === 0) {
      return await this.getConfigById(id);
    }

    setParts.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await connection.execute(`
      UPDATE notification_configs 
      SET ${setParts.join(', ')}
      WHERE id = ?
    `, values);

    return await this.getConfigById(id);
  }

  async deleteConfig(id: string): Promise<boolean> {
    const connection = await this.getConnection();
    const [result] = await connection.execute(
      'DELETE FROM notification_configs WHERE id = ?',
      [id]
    );
    return (result as any).affectedRows > 0;
  }

  // ========== INITIALISATION DES DONNÉES PAR DÉFAUT ==========

  async initializeDefaultConfigs(): Promise<void> {
    
    
    const existingConfigs = await this.getAllConfigs();
    const existingIds = new Set(existingConfigs.map(c => c.id));
    
    const toCreate = DEFAULT_NOTIFICATION_CONFIGS.filter(config => !existingIds.has(config.id));
    
    if (toCreate.length === 0) {
      
      return;
    }

    
    
    for (const config of toCreate) {
      await this.createConfig(config);
    }
    
    
  }

  async resetToDefaults(): Promise<void> {
    
    
    const connection = await this.getConnection();
    
    // Supprimer toutes les configurations existantes
    await connection.execute('DELETE FROM notification_configs');
    
    
    // Recréer toutes les configurations par défaut
    for (const config of DEFAULT_NOTIFICATION_CONFIGS) {
      await this.createConfig(config);
    }
    
    
  }

  // ========== GESTION DES PRÉFÉRENCES ==========

  async getAllPreferences(): Promise<NotificationPreference[]> {
    const connection = await this.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        id,
        user_id as userId,
        user_role as userRole,
        module,
        action_type as actionType,
        enabled,
        custom_settings as customSettings,
        created_at as createdAt,
        updated_at as updatedAt
      FROM notification_preferences
      ORDER BY user_id, module, action_type
    `);

    return (rows as any[]).map(row => ({
      ...row,
      customSettings: row.customSettings ? JSON.parse(row.customSettings) : undefined,
    }));
  }

  async getPreferencesByUserId(userId: string): Promise<NotificationPreference[]> {
    const connection = await this.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        id,
        user_id as userId,
        user_role as userRole,
        module,
        action_type as actionType,
        enabled,
        custom_settings as customSettings,
        created_at as createdAt,
        updated_at as updatedAt
      FROM notification_preferences
      WHERE user_id = ?
      ORDER BY module, action_type
    `, [userId]);

    return (rows as any[]).map(row => ({
      ...row,
      customSettings: row.customSettings ? JSON.parse(row.customSettings) : undefined,
    }));
  }

  async getPreferencesByRole(role: string): Promise<NotificationPreference[]> {
    const connection = await this.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        id,
        user_id as userId,
        user_role as userRole,
        module,
        action_type as actionType,
        enabled,
        custom_settings as customSettings,
        created_at as createdAt,
        updated_at as updatedAt
      FROM notification_preferences
      WHERE user_role = ?
      ORDER BY user_id, module, action_type
    `, [role]);

    return (rows as any[]).map(row => ({
      ...row,
      customSettings: row.customSettings ? JSON.parse(row.customSettings) : undefined,
    }));
  }

  async createOrUpdatePreference(
    userId: string,
    userRole: string,
    module: string,
    actionType: string,
    enabled: boolean,
    customSettings?: Record<string, any>
  ): Promise<NotificationPreference> {
    const connection = await this.getConnection();
    const now = new Date().toISOString();

    await connection.execute(`
      INSERT INTO notification_preferences (
        user_id, user_role, module, action_type, enabled, custom_settings, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        enabled = VALUES(enabled),
        custom_settings = VALUES(custom_settings),
        updated_at = VALUES(updated_at)
    `, [
      userId,
      userRole,
      module,
      actionType,
      enabled,
      customSettings ? JSON.stringify(customSettings) : null,
      now,
      now
    ]);

    // Récupérer la préférence créée/mise à jour
    const [rows] = await connection.execute(`
      SELECT 
        id,
        user_id as userId,
        user_role as userRole,
        module,
        action_type as actionType,
        enabled,
        custom_settings as customSettings,
        created_at as createdAt,
        updated_at as updatedAt
      FROM notification_preferences
      WHERE user_id = ? AND module = ? AND action_type = ?
    `, [userId, module, actionType]);

    const result = (rows as any[])[0];
    return {
      ...result,
      customSettings: result.customSettings ? JSON.parse(result.customSettings) : undefined,
    };
  }

  async shouldNotify(userId: string, userRole: string, module: string, actionType: string): Promise<boolean> {
    const connection = await this.getConnection();
    
    // D'abord vérifier si l'utilisateur a une préférence spécifique
    const [userRows] = await connection.execute(`
      SELECT enabled FROM notification_preferences
      WHERE user_id = ? AND module = ? AND action_type = ?
    `, [userId, module, actionType]);

    if ((userRows as any[]).length > 0) {
      return (userRows as any[])[0].enabled;
    }

    // Sinon, vérifier la configuration par défaut pour ce rôle
    const [configRows] = await connection.execute(`
      SELECT default_roles FROM notification_configs
      WHERE module = ? AND action_type = ? AND enabled = 1
    `, [module, actionType]);

    if ((configRows as any[]).length > 0) {
      const defaultRoles = JSON.parse((configRows as any[])[0].default_roles || '[]');
      return defaultRoles.includes(userRole);
    }

    return false;
  }

  // ========== UTILITAIRES ==========

  async getStats(): Promise<{
    totalConfigs: number;
    enabledConfigs: number;
    totalPreferences: number;
    preferencesByRole: Record<string, number>;
  }> {
    const connection = await this.getConnection();
    
    const [configStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(enabled) as enabled
      FROM notification_configs
    `);

    const [prefStats] = await connection.execute(`
      SELECT COUNT(*) as total FROM notification_preferences
    `);

    const [roleStats] = await connection.execute(`
      SELECT 
        user_role,
        COUNT(*) as count
      FROM notification_preferences
      GROUP BY user_role
    `);

    const preferencesByRole: Record<string, number> = {};
    (roleStats as any[]).forEach(row => {
      preferencesByRole[row.user_role] = row.count;
    });

    return {
      totalConfigs: (configStats as any[])[0].total,
      enabledConfigs: (configStats as any[])[0].enabled,
      totalPreferences: (prefStats as any[])[0].total,
      preferencesByRole
    };
  }
}

export const notificationConfigService = new NotificationConfigService();
