import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Pour les modules ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PREFERENCES_FILE = path.join(process.cwd(), 'data', 'notification-preferences.json');
const NOTIFICATIONS_FILE = path.join(process.cwd(), 'data', 'notifications.json');
const READ_STATUS_FILE = path.join(process.cwd(), 'data', 'notification-read-status.json');

// Interface pour les préférences de notifications
interface NotificationPreference {
  id: string;
  role: string;
  module: string;
  actionType: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Interface pour les notifications basées sur les rôles
interface RoleBasedNotification {
  id: string;
  targetRoles: string[];
  module: string;
  actionType: string;
  message: any;
  details: string;
  createdAt: string;
  isRead: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  specificUsers?: Array<{
    id: string;
    email: string;
    reason: string;
  }>;
  metadata?: {
    entityId?: string;
    entityType?: string;
    createdBy?: string;
    assignedTo?: string[];
    triggeredBy?: string;
    [key: string]: any;
  };
}

// Interface pour les statuts de lecture
interface NotificationReadStatus {
  id: string;
  userId: string;
  notificationId: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// Rôles disponibles dans le système
const USER_ROLES = ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN', 'GUEST'];

// Modules disponibles dans le système
const MODULES = ['USERS', 'CHEMICALS', 'EQUIPMENT', 'ROOMS', 'CALENDAR', 'ORDERS', 'SECURITY', 'SYSTEM'];

// Configuration par défaut des notifications par module et action
const DEFAULT_NOTIFICATION_CONFIGS = [
  // Module USERS
  { module: 'USERS', actionType: 'NEW_USER_REGISTRATION', name: 'Nouvelle inscription utilisateur', description: 'Notification envoyée lors de l\'inscription d\'un nouvel utilisateur', severity: 'medium' as const, defaultRoles: ['ADMIN', 'ADMINLABO'] },
  { module: 'USERS', actionType: 'ACCOUNT_ACTIVATED', name: 'Compte utilisateur activé', description: 'Notification envoyée lorsqu\'un compte utilisateur est activé', severity: 'low' as const, defaultRoles: ['ADMIN'] },
  { module: 'USERS', actionType: 'ROLE_CHANGED', name: 'Rôle utilisateur modifié', description: 'Notification envoyée lorsque le rôle d\'un utilisateur est modifié', severity: 'medium' as const, defaultRoles: ['ADMIN'] },
  { module: 'USERS', actionType: 'CREATE', name: 'Création utilisateur', description: 'Notification lors de la création d\'un utilisateur', severity: 'medium' as const, defaultRoles: ['ADMIN'] },
  { module: 'USERS', actionType: 'UPDATE', name: 'Modification utilisateur', description: 'Notification lors de la modification d\'un utilisateur', severity: 'low' as const, defaultRoles: ['ADMIN'] },
  { module: 'USERS', actionType: 'DELETE', name: 'Suppression utilisateur', description: 'Notification lors de la suppression d\'un utilisateur', severity: 'high' as const, defaultRoles: ['ADMIN'] },

  // Module CHEMICALS
  { module: 'CHEMICALS', actionType: 'STOCK_LOW', name: 'Stock faible de produit chimique', description: 'Notification envoyée lorsque le stock d\'un produit chimique est bas', severity: 'high' as const, defaultRoles: ['ADMIN', 'ADMINLABO', 'LABORANTIN'] },
  { module: 'CHEMICALS', actionType: 'EXPIRY_WARNING', name: 'Produit chimique bientôt périmé', description: 'Notification envoyée lorsqu\'un produit chimique approche de sa date d\'expiration', severity: 'medium' as const, defaultRoles: ['ADMINLABO', 'LABORANTIN'] },
  { module: 'CHEMICALS', actionType: 'NEW_ARRIVAL', name: 'Nouveau produit chimique ajouté', description: 'Notification envoyée lorsqu\'un nouveau produit chimique est ajouté', severity: 'low' as const, defaultRoles: ['ADMINLABO', 'LABORANTIN'] },
  { module: 'CHEMICALS', actionType: 'CREATE', name: 'Création produit chimique', description: 'Notification lors de la création d\'un produit chimique', severity: 'medium' as const, defaultRoles: ['ADMINLABO'] },
  { module: 'CHEMICALS', actionType: 'UPDATE', name: 'Modification produit chimique', description: 'Notification lors de la modification d\'un produit chimique', severity: 'low' as const, defaultRoles: ['ADMINLABO'] },
  { module: 'CHEMICALS', actionType: 'DELETE', name: 'Suppression produit chimique', description: 'Notification lors de la suppression d\'un produit chimique', severity: 'high' as const, defaultRoles: ['ADMIN', 'ADMINLABO'] },

  // Module EQUIPMENT
  { module: 'EQUIPMENT', actionType: 'MAINTENANCE_DUE', name: 'Maintenance d\'équipement requise', description: 'Notification envoyée lorsqu\'un équipement nécessite une maintenance', severity: 'high' as const, defaultRoles: ['ADMIN', 'ADMINLABO', 'LABORANTIN'] },
  { module: 'EQUIPMENT', actionType: 'MALFUNCTION', name: 'Dysfonctionnement d\'équipement', description: 'Notification envoyée lorsqu\'un équipement présente un dysfonctionnement', severity: 'critical' as const, defaultRoles: ['ADMIN', 'ADMINLABO', 'LABORANTIN'] },
  { module: 'EQUIPMENT', actionType: 'CALIBRATION_DUE', name: 'Calibration d\'équipement requise', description: 'Notification envoyée lorsqu\'un équipement nécessite une calibration', severity: 'medium' as const, defaultRoles: ['ADMINLABO', 'LABORANTIN'] },
  { module: 'EQUIPMENT', actionType: 'CREATE', name: 'Création équipement', description: 'Notification lors de la création d\'un équipement', severity: 'medium' as const, defaultRoles: ['ADMIN', 'ADMINLABO'] },
  { module: 'EQUIPMENT', actionType: 'UPDATE', name: 'Modification équipement', description: 'Notification lors de la modification d\'un équipement', severity: 'low' as const, defaultRoles: ['ADMINLABO'] },
  { module: 'EQUIPMENT', actionType: 'DELETE', name: 'Suppression équipement', description: 'Notification lors de la suppression d\'un équipement', severity: 'high' as const, defaultRoles: ['ADMIN', 'ADMINLABO'] },

  // Module ROOMS
  { module: 'ROOMS', actionType: 'ROOM_RESERVED', name: 'Salle réservée', description: 'Notification envoyée lorsqu\'une salle est réservée', severity: 'low' as const, defaultRoles: ['TEACHER', 'LABORANTIN'] },
  { module: 'ROOMS', actionType: 'BOOKING_CONFLICT', name: 'Conflit de réservation', description: 'Notification envoyée en cas de conflit de réservation de salle', severity: 'high' as const, defaultRoles: ['ADMIN', 'ADMINLABO', 'TEACHER'] },
  { module: 'ROOMS', actionType: 'MAINTENANCE_SCHEDULED', name: 'Maintenance de salle programmée', description: 'Notification envoyée lorsqu\'une maintenance de salle est programmée', severity: 'medium' as const, defaultRoles: ['ADMIN', 'ADMINLABO', 'LABORANTIN'] },
  { module: 'ROOMS', actionType: 'CREATE', name: 'Création salle', description: 'Notification lors de la création d\'une salle', severity: 'medium' as const, defaultRoles: ['ADMIN', 'ADMINLABO'] },
  { module: 'ROOMS', actionType: 'UPDATE', name: 'Modification salle', description: 'Notification lors de la modification d\'une salle', severity: 'low' as const, defaultRoles: ['ADMIN', 'ADMINLABO'] },
  { module: 'ROOMS', actionType: 'DELETE', name: 'Suppression salle', description: 'Notification lors de la suppression d\'une salle', severity: 'high' as const, defaultRoles: ['ADMIN'] },

  // Module CALENDAR
  { module: 'CALENDAR', actionType: 'EVENT_CREATED', name: 'Événement créé', description: 'Notification envoyée lorsqu\'un nouvel événement est créé', severity: 'low' as const, defaultRoles: ['ADMIN', 'TEACHER'] },
  { module: 'CALENDAR', actionType: 'EVENT_MODIFIED', name: 'Événement modifié', description: 'Notification envoyée lorsqu\'un événement existant est modifié', severity: 'medium' as const, defaultRoles: ['ADMIN', 'TEACHER'] },
  { module: 'CALENDAR', actionType: 'EVENT_REMINDER', name: 'Rappel d\'événement', description: 'Notification de rappel envoyée avant un événement', severity: 'low' as const, defaultRoles: ['TEACHER'] },
  { module: 'CALENDAR', actionType: 'VALIDATE_EVENT', name: 'Validation événement', description: 'Notification lors de la validation d\'un événement', severity: 'high' as const, defaultRoles: ['ADMIN', 'ADMINLABO'] },
  { module: 'CALENDAR', actionType: 'CREATE', name: 'Création événement', description: 'Notification lors de la création d\'un événement', severity: 'medium' as const, defaultRoles: ['ADMIN', 'TEACHER'] },
  { module: 'CALENDAR', actionType: 'UPDATE', name: 'Modification événement', description: 'Notification lors de la modification d\'un événement', severity: 'medium' as const, defaultRoles: ['ADMIN', 'TEACHER'] },

  // Module ORDERS
  { module: 'ORDERS', actionType: 'ORDER_DELIVERED', name: 'Commande livrée', description: 'Notification envoyée lorsqu\'une commande est livrée', severity: 'medium' as const, defaultRoles: ['ADMIN', 'ADMINLABO'] },
  { module: 'ORDERS', actionType: 'ORDER_DELAYED', name: 'Commande retardée', description: 'Notification envoyée lorsqu\'une commande est retardée', severity: 'high' as const, defaultRoles: ['ADMIN', 'ADMINLABO'] },
  { module: 'ORDERS', actionType: 'ORDER_APPROVED', name: 'Commande approuvée', description: 'Notification envoyée lorsqu\'une commande est approuvée', severity: 'low' as const, defaultRoles: ['ADMINLABO'] },
  { module: 'ORDERS', actionType: 'CREATE', name: 'Création commande', description: 'Notification lors de la création d\'une commande', severity: 'medium' as const, defaultRoles: ['ADMIN', 'ADMINLABO'] },
  { module: 'ORDERS', actionType: 'UPDATE', name: 'Modification commande', description: 'Notification lors de la modification d\'une commande', severity: 'medium' as const, defaultRoles: ['ADMIN', 'ADMINLABO'] },

  // Module SECURITY
  { module: 'SECURITY', actionType: 'SECURITY_ALERT', name: 'Alerte de sécurité', description: 'Notification envoyée en cas d\'incident de sécurité', severity: 'critical' as const, defaultRoles: ['ADMIN'] },
  { module: 'SECURITY', actionType: 'ACCESS_DENIED', name: 'Accès refusé', description: 'Notification envoyée lors d\'une tentative d\'accès non autorisé', severity: 'high' as const, defaultRoles: ['ADMIN'] },
  { module: 'SECURITY', actionType: 'SUSPICIOUS_LOGIN', name: 'Connexion suspecte', description: 'Notification envoyée lors d\'une connexion depuis un lieu inhabituel', severity: 'medium' as const, defaultRoles: ['ADMIN'] },
  { module: 'SECURITY', actionType: 'LOGIN', name: 'Connexion utilisateur', description: 'Notification lors de la connexion d\'un utilisateur', severity: 'low' as const, defaultRoles: [] },
  { module: 'SECURITY', actionType: 'LOGOUT', name: 'Déconnexion utilisateur', description: 'Notification lors de la déconnexion d\'un utilisateur', severity: 'low' as const, defaultRoles: [] },

  // Module SYSTEM
  { module: 'SYSTEM', actionType: 'MAINTENANCE', name: 'Maintenance système', description: 'Notification envoyée lors d\'une maintenance système programmée', severity: 'high' as const, defaultRoles: ['ADMIN'] },
  { module: 'SYSTEM', actionType: 'BACKUP_COMPLETED', name: 'Sauvegarde terminée', description: 'Notification envoyée lorsqu\'une sauvegarde système est terminée', severity: 'low' as const, defaultRoles: ['ADMIN'] },
  { module: 'SYSTEM', actionType: 'UPDATE_AVAILABLE', name: 'Mise à jour disponible', description: 'Notification envoyée lorsqu\'une mise à jour système est disponible', severity: 'medium' as const, defaultRoles: ['ADMIN'] },
  { module: 'SYSTEM', actionType: 'ERROR', name: 'Erreur système', description: 'Notification lors d\'erreurs système', severity: 'critical' as const, defaultRoles: ['ADMIN'] }
];

// Notifications d'exemple pour tester le système
const SAMPLE_NOTIFICATIONS: RoleBasedNotification[] = [
  {
    id: 'notif_001',
    targetRoles: ['ADMIN'],
    module: 'SYSTEM',
    actionType: 'MAINTENANCE',
    message: {
      fr: 'Maintenance système programmée pour ce soir à 22h00',
      en: 'System maintenance scheduled for tonight at 10:00 PM'
    },
    details: 'Une maintenance de routine sera effectuée sur les serveurs. Durée estimée: 2 heures.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Il y a 2 heures
    isRead: false,
    severity: 'high',
    metadata: {
      entityType: 'system',
      triggeredBy: 'SYSTEM'
    }
  },
  {
    id: 'notif_002',
    targetRoles: ['ADMIN', 'ADMINLABO'],
    module: 'USERS',
    actionType: 'NEW_USER_REGISTRATION',
    message: {
      fr: 'Nouvelle demande d\'inscription utilisateur en attente',
      en: 'New user registration request pending'
    },
    details: 'Un nouvel utilisateur (jean.dupont@example.com) a demandé l\'accès au système.',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // Il y a 4 heures
    isRead: false,
    severity: 'medium',
    metadata: {
      entityType: 'user',
      entityId: 'user_pending_001'
    }
  },
  {
    id: 'notif_003',
    targetRoles: ['ADMINLABO', 'LABORANTIN'],
    module: 'CHEMICALS',
    actionType: 'STOCK_LOW',
    message: {
      fr: 'Stock faible: Acide sulfurique (H2SO4)',
      en: 'Low stock: Sulfuric acid (H2SO4)'
    },
    details: 'Le stock d\'acide sulfurique est en dessous du seuil minimum (5 unités restantes).',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // Il y a 6 heures
    isRead: false,
    severity: 'high',
    metadata: {
      entityType: 'chemical',
      entityId: 'chem_h2so4_001'
    }
  },
  {
    id: 'notif_004',
    targetRoles: ['TEACHER'],
    module: 'CALENDAR',
    actionType: 'EVENT_CREATED',
    message: {
      fr: 'Nouvel événement: TP Chimie Organique',
      en: 'New event: Organic Chemistry Lab'
    },
    details: 'Un nouveau TP de chimie organique a été programmé pour demain de 14h à 16h en salle B201.',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // Il y a 8 heures
    isRead: false,
    severity: 'low',
    metadata: {
      entityType: 'event',
      entityId: 'event_tp_001',
      createdBy: 'USER_TEACHER_001'
    }
  },
  {
    id: 'notif_005',
    targetRoles: ['ADMIN', 'ADMINLABO'],
    module: 'EQUIPMENT',
    actionType: 'MAINTENANCE_DUE',
    message: {
      fr: 'Maintenance requise: Spectromètre IR',
      en: 'Maintenance required: IR Spectrometer'
    },
    details: 'Le spectromètre infrarouge (SN: IR-2023-001) nécessite une maintenance préventive.',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // Il y a 12 heures
    isRead: false,
    severity: 'high',
    metadata: {
      entityType: 'equipment',
      entityId: 'equip_ir_001'
    }
  },
  {
    id: 'notif_006',
    targetRoles: ['ADMIN'],
    module: 'SECURITY',
    actionType: 'SECURITY_ALERT',
    message: {
      fr: 'Tentative de connexion suspecte détectée',
      en: 'Suspicious login attempt detected'
    },
    details: 'Plusieurs tentatives de connexion échouées depuis l\'adresse IP 192.168.1.100.',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // Il y a 1 heure
    isRead: false,
    severity: 'critical',
    metadata: {
      entityType: 'security',
      triggeredBy: 'SECURITY_SYSTEM'
    }
  },
  {
    id: 'notif_007',
    targetRoles: ['ADMIN', 'ADMINLABO'],
    module: 'ORDERS',
    actionType: 'ORDER_DELIVERED',
    message: {
      fr: 'Commande livrée: Verrerie de laboratoire',
      en: 'Order delivered: Laboratory glassware'
    },
    details: 'La commande #ORD-2024-001 de verrerie de laboratoire a été livrée et est disponible en réception.',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // Il y a 3 heures
    isRead: false,
    severity: 'medium',
    metadata: {
      entityType: 'order',
      entityId: 'order_001'
    }
  },
  {
    id: 'notif_008',
    targetRoles: ['ADMIN', 'TEACHER'],
    specificUsers: [
      {
        id: 'USER_001',
        email: 'admin@labo.fr',
        reason: 'createdBy'
      }
    ],
    module: 'CALENDAR',
    actionType: 'EVENT_CREATED',
    message: {
      fr: 'Votre événement a été créé avec succès',
      en: 'Your event has been created successfully'
    },
    details: 'L\'événement "Réunion équipe pédagogique" a été créé et ajouté au calendrier.',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Il y a 30 minutes
    isRead: false,
    severity: 'low',
    metadata: {
      entityType: 'event',
      entityId: 'event_meeting_001',
      createdBy: 'USER_001'
    }
  }
];

export class NotificationPreferencesService {
  
  async initializeDefaultPreferences(): Promise<void> {
    console.log('[NotificationPreferencesService] 🚀 Début de l\'initialisation...');
    
    // Initialiser les préférences
    await this.initializePreferences();
    
    // Initialiser les notifications d'exemple
    await this.initializeNotifications();
    
    // Initialiser les statuts de lecture
    await this.initializeReadStatuses();
    
    console.log('[NotificationPreferencesService] ✅ Initialisation terminée.');
  }
  
  private async initializePreferences(): Promise<void> {
    console.log('[NotificationPreferencesService] Initialisation des préférences...');
    
    let existingPreferences: NotificationPreference[] = [];
    
    // Lire les préférences existantes
    try {
      const data = await fs.readFile(PREFERENCES_FILE, 'utf-8');
      existingPreferences = JSON.parse(data);
      console.log(`[NotificationPreferencesService] ${existingPreferences.length} préférences existantes trouvées.`);
    } catch (error) {
      console.log('[NotificationPreferencesService] Aucune préférence existante trouvée.');
    }
    
    // Identifier les préférences manquantes
    const missingPreferences: NotificationPreference[] = [];
    
    for (const role of USER_ROLES) {
      for (const config of DEFAULT_NOTIFICATION_CONFIGS) {
        const exists = existingPreferences.some(pref => 
          pref.role === role && 
          pref.module === config.module && 
          pref.actionType === config.actionType
        );
        
        if (!exists) {
          const isEnabledByDefault = config.defaultRoles.includes(role);
          
          missingPreferences.push({
            id: uuidv4(),
            role,
            module: config.module,
            actionType: config.actionType,
            enabled: isEnabledByDefault,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    }
    
    if (missingPreferences.length > 0) {
      console.log(`[NotificationPreferencesService] ${missingPreferences.length} préférences manquantes détectées.`);
      
      // Fusionner les préférences
      const allPreferences = [...existingPreferences, ...missingPreferences];
      await this.writePreferences(allPreferences);
      
      console.log(`[NotificationPreferencesService] ${missingPreferences.length} nouvelles préférences ajoutées.`);
    } else {
      console.log('[NotificationPreferencesService] Toutes les préférences sont déjà présentes.');
    }
  }
  
  private async initializeNotifications(): Promise<void> {
    console.log('[NotificationPreferencesService] Initialisation des notifications d\'exemple...');
    
    let existingNotifications: RoleBasedNotification[] = [];
    
    // Lire les notifications existantes
    try {
      const data = await fs.readFile(NOTIFICATIONS_FILE, 'utf-8');
      existingNotifications = JSON.parse(data);
      console.log(`[NotificationPreferencesService] ${existingNotifications.length} notifications existantes trouvées.`);
    } catch (error) {
      console.log('[NotificationPreferencesService] Aucune notification existante trouvée.');
    }
    
    // Ajouter les notifications d'exemple si le fichier est vide
    if (existingNotifications.length === 0) {
      await this.writeNotifications(SAMPLE_NOTIFICATIONS);
      console.log(`[NotificationPreferencesService] ${SAMPLE_NOTIFICATIONS.length} notifications d\'exemple ajoutées.`);
    } else {
      console.log('[NotificationPreferencesService] Des notifications existent déjà, aucune notification d\'exemple ajoutée.');
    }
  }
  
  private async initializeReadStatuses(): Promise<void> {
    console.log('[NotificationPreferencesService] Initialisation des statuts de lecture...');
    
    try {
      await fs.access(READ_STATUS_FILE);
      console.log('[NotificationPreferencesService] Fichier des statuts de lecture déjà existant.');
    } catch (error) {
      // Créer un fichier vide pour les statuts de lecture
      await this.writeReadStatuses([]);
      console.log('[NotificationPreferencesService] Fichier des statuts de lecture créé.');
    }
  }
  
  async getPreferences(): Promise<NotificationPreference[]> {
    try {
      const data = await fs.readFile(PREFERENCES_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading notification preferences:', error);
      return [];
    }
  }
  
  async getPreferencesByRole(role: string): Promise<NotificationPreference[]> {
    const preferences = await this.getPreferences();
    return preferences.filter(pref => pref.role === role);
  }
  
  async updatePreference(id: string, enabled: boolean): Promise<boolean> {
    try {
      const preferences = await this.getPreferences();
      const index = preferences.findIndex(pref => pref.id === id);
      
      if (index === -1) {
        console.warn(`[NotificationPreferencesService] Préférence ${id} non trouvée.`);
        return false;
      }
      
      preferences[index].enabled = enabled;
      preferences[index].updatedAt = new Date().toISOString();
      
      await this.writePreferences(preferences);
      return true;
    } catch (error) {
      console.error('Error updating notification preference:', error);
      return false;
    }
  }
  
  async updatePreferencesByRole(role: string, updates: { module: string; actionType: string; enabled: boolean }[]): Promise<boolean> {
    try {
      const preferences = await this.getPreferences();
      
      for (const update of updates) {
        const index = preferences.findIndex(pref => 
          pref.role === role && 
          pref.module === update.module && 
          pref.actionType === update.actionType
        );
        
        if (index !== -1) {
          preferences[index].enabled = update.enabled;
          preferences[index].updatedAt = new Date().toISOString();
        }
      }
      
      await this.writePreferences(preferences);
      return true;
    } catch (error) {
      console.error('Error updating notification preferences by role:', error);
      return false;
    }
  }
  
  async shouldNotify(role: string, module: string, actionType: string): Promise<boolean> {
    const preferences = await this.getPreferences();
    const preference = preferences.find(pref => 
      pref.role === role && 
      pref.module === module && 
      pref.actionType === actionType
    );
    
    return preference ? preference.enabled : false;
  }
  
  async getNotifications(): Promise<RoleBasedNotification[]> {
    try {
      const data = await fs.readFile(NOTIFICATIONS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading notifications:', error);
      return [];
    }
  }
  
  private async writePreferences(preferences: NotificationPreference[]): Promise<void> {
    // Créer le dossier data s'il n'existe pas
    const dataDir = path.dirname(PREFERENCES_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
      console.log('[NotificationPreferencesService] Dossier data créé.');
    }
    
    await fs.writeFile(PREFERENCES_FILE, JSON.stringify(preferences, null, 2));
    console.log('[NotificationPreferencesService] Préférences enregistrées dans le fichier.');
  }
  
  private async writeNotifications(notifications: RoleBasedNotification[]): Promise<void> {
    // Créer le dossier data s'il n'existe pas
    const dataDir = path.dirname(NOTIFICATIONS_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
      console.log('[NotificationPreferencesService] Dossier data créé.');
    }
    
    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
    console.log('[NotificationPreferencesService] Notifications enregistrées dans le fichier.');
  }
  
  private async writeReadStatuses(statuses: NotificationReadStatus[]): Promise<void> {
    // Créer le dossier data s'il n'existe pas
    const dataDir = path.dirname(READ_STATUS_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
      console.log('[NotificationPreferencesService] Dossier data créé.');
    }
    
    await fs.writeFile(READ_STATUS_FILE, JSON.stringify(statuses, null, 2));
    console.log('[NotificationPreferencesService] Statuts de lecture enregistrés dans le fichier.');
  }
  
  // Méthode pour forcer la réinitialisation complète
  async forceReset(): Promise<void> {
    console.log('[NotificationPreferencesService] 🔄 Réinitialisation forcée...');
    
    try {
      // Supprimer les fichiers existants
      await fs.unlink(PREFERENCES_FILE).catch(() => {});
      await fs.unlink(NOTIFICATIONS_FILE).catch(() => {});
      await fs.unlink(READ_STATUS_FILE).catch(() => {});
      console.log('[NotificationPreferencesService] Fichiers existants supprimés.');
      
      // Recréer avec les valeurs par défaut
      const defaultPreferences: NotificationPreference[] = [];
      for (const role of USER_ROLES) {
        for (const config of DEFAULT_NOTIFICATION_CONFIGS) {
          const isEnabledByDefault = config.defaultRoles.includes(role);
          
          defaultPreferences.push({
            id: uuidv4(),
            role,
            module: config.module,
            actionType: config.actionType,
            enabled: isEnabledByDefault,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      await this.writePreferences(defaultPreferences);
      await this.writeNotifications(SAMPLE_NOTIFICATIONS);
      await this.writeReadStatuses([]);
      
      console.log('[NotificationPreferencesService] ✅ Réinitialisation forcée terminée.');
      
    } catch (error) {
      console.error('[NotificationPreferencesService] ❌ Erreur lors de la réinitialisation:', error);
      throw error;
    }
  }
}

export const notificationPreferencesService = new NotificationPreferencesService();

// Fonction d'initialisation standalone
async function initializeNotificationSystem(forceReset: boolean = false) {
  try {
    console.log('🚀 Initialisation du système de notifications basé sur les rôles...');
    
    const service = new NotificationPreferencesService();
    
    if (forceReset) {
      console.log('⚠️  Mode réinitialisation forcée activé...');
      await service.forceReset();
    } else {
      await service.initializeDefaultPreferences();
    }
    
    // Afficher un résumé
    const preferences = await service.getPreferences();
    const notifications = await service.getNotifications();
    
    console.log('\n📊 Résumé de l\'initialisation:');
    console.log(`   ✅ ${DEFAULT_NOTIFICATION_CONFIGS.length} types de notifications configurés`);
    console.log(`   ✅ ${preferences.length} préférences utilisateur configurées`);
    console.log(`   ✅ ${notifications.length} notifications d\'exemple créées`);
    
    console.log('\n📋 Préférences par rôle:');
    for (const role of USER_ROLES) {
      const rolePreferences = preferences.filter(p => p.role === role);
      const enabledCount = rolePreferences.filter(p => p.enabled).length;
      console.log(`   ${role}: ${enabledCount}/${rolePreferences.length} notifications activées`);
    }
    
    console.log('\n📝 Types de notifications par module:');
    const configsByModule = DEFAULT_NOTIFICATION_CONFIGS.reduce((acc, config) => {
      acc[config.module] = (acc[config.module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(configsByModule).forEach(([module, count]) => {
      console.log(`   ${module}: ${count} types de notifications`);
    });
    
    console.log('\n📬 Notifications d\'exemple par module:');
    const notificationsByModule = notifications.reduce((acc, notif) => {
      acc[notif.module] = (acc[notif.module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(notificationsByModule).forEach(([module, count]) => {
      console.log(`   ${module}: ${count} notifications`);
    });
    
    console.log('\n🎯 Notifications par rôle cible:');
    const notificationsByRole = notifications.reduce((acc, notif) => {
      notif.targetRoles.forEach(role => {
        acc[role] = (acc[role] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(notificationsByRole).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} notifications ciblées`);
    });
    
    console.log('\n🎉 Système de notifications basé sur les rôles initialisé avec succès!');
    console.log('\n📁 Fichiers créés:');
    console.log(`   📄 ${PREFERENCES_FILE}`);
    console.log(`   📄 ${NOTIFICATIONS_FILE}`);
    console.log(`   📄 ${READ_STATUS_FILE}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation du système de notifications:', error);
    throw error;
  }
}

// Exécuter l'initialisation si ce fichier est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  // Vérifier si l'argument --force-reset est passé
  const forceReset = process.argv.includes('--force-reset');
  
  initializeNotificationSystem(forceReset)
    .then(() => {
      console.log('✅ Initialisation terminée');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Échec de l\'initialisation:', error);
      process.exit(1);
    });
}