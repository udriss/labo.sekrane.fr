import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NotificationPreference, NotificationConfig } from '@/types/notifications';
import { AuditAction } from '@/types/audit';

// Pour les modules ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PREFERENCES_FILE = path.join(process.cwd(), 'data', 'notification-preferences.json');
const CONFIG_FILE = path.join(process.cwd(), 'data', 'notification-configs.json');

// Configuration par défaut des notifications
const DEFAULT_CONFIGS: NotificationConfig[] = [
  // USERS module
  { id: 'users-create', name: 'Création utilisateur', description: 'Notification lors de la création d\'un nouvel utilisateur', module: 'USERS', actionType: 'CREATE', defaultEnabled: true, severity: 'medium' },
  { id: 'users-update', name: 'Modification utilisateur', description: 'Notification lors de la modification d\'un utilisateur', module: 'USERS', actionType: 'UPDATE', defaultEnabled: false, severity: 'low' },
  { id: 'users-delete', name: 'Suppression utilisateur', description: 'Notification lors de la suppression d\'un utilisateur', module: 'USERS', actionType: 'DELETE', defaultEnabled: true, severity: 'high' },
  
  // CHEMICALS module
  { id: 'chemicals-create', name: 'Ajout produit chimique', description: 'Notification lors de l\'ajout d\'un nouveau produit chimique', module: 'CHEMICALS', actionType: 'CREATE', defaultEnabled: true, severity: 'medium' },
  { id: 'chemicals-update', name: 'Modification produit chimique', description: 'Notification lors de la modification d\'un produit chimique', module: 'CHEMICALS', actionType: 'UPDATE', defaultEnabled: false, severity: 'low' },
  { id: 'chemicals-delete', name: 'Suppression produit chimique', description: 'Notification lors de la suppression d\'un produit chimique', module: 'CHEMICALS', actionType: 'DELETE', defaultEnabled: true, severity: 'high' },
  
  // EQUIPMENT module
  { id: 'equipment-create', name: 'Ajout équipement', description: 'Notification lors de l\'ajout d\'un nouvel équipement', module: 'EQUIPMENT', actionType: 'CREATE', defaultEnabled: true, severity: 'medium' },
  { id: 'equipment-update', name: 'Modification équipement', description: 'Notification lors de la modification d\'un équipement', module: 'EQUIPMENT', actionType: 'UPDATE', defaultEnabled: false, severity: 'low' },
  { id: 'equipment-delete', name: 'Suppression équipement', description: 'Notification lors de la suppression d\'un équipement', module: 'EQUIPMENT', actionType: 'DELETE', defaultEnabled: true, severity: 'high' },
  
  // CALENDAR module
  { id: 'calendar-create', name: 'Création événement', description: 'Notification lors de la création d\'un événement', module: 'CALENDAR', actionType: 'CREATE', defaultEnabled: true, severity: 'medium' },
  { id: 'calendar-update', name: 'Modification événement', description: 'Notification lors de la modification d\'un événement', module: 'CALENDAR', actionType: 'UPDATE', defaultEnabled: true, severity: 'medium' },
  { id: 'calendar-validate', name: 'Validation événement', description: 'Notification lors de la validation d\'un événement', module: 'CALENDAR', actionType: 'VALIDATE_EVENT', defaultEnabled: true, severity: 'high' },
  
  // SECURITY module
  { id: 'security-login', name: 'Connexion utilisateur', description: 'Notification lors de la connexion d\'un utilisateur', module: 'SECURITY', actionType: 'LOGIN', defaultEnabled: false, severity: 'low' },
  { id: 'security-logout', name: 'Déconnexion utilisateur', description: 'Notification lors de la déconnexion d\'un utilisateur', module: 'SECURITY', actionType: 'LOGOUT', defaultEnabled: false, severity: 'low' },
  
  // ROOMS module
  { id: 'rooms-create', name: 'Création salle', description: 'Notification lors de la création d\'une nouvelle salle', module: 'ROOMS', actionType: 'CREATE', defaultEnabled: true, severity: 'medium' },
  { id: 'rooms-update', name: 'Modification salle', description: 'Notification lors de la modification d\'une salle', module: 'ROOMS', actionType: 'UPDATE', defaultEnabled: false, severity: 'low' },
  { id: 'rooms-delete', name: 'Suppression salle', description: 'Notification lors de la suppression d\'une salle', module: 'ROOMS', actionType: 'DELETE', defaultEnabled: true, severity: 'high' },
  
  // ORDERS module
  { id: 'orders-create', name: 'Création commande', description: 'Notification lors de la création d\'une nouvelle commande', module: 'ORDERS', actionType: 'CREATE', defaultEnabled: true, severity: 'medium' },
  { id: 'orders-update', name: 'Modification commande', description: 'Notification lors de la modification d\'une commande', module: 'ORDERS', actionType: 'UPDATE', defaultEnabled: true, severity: 'medium' },
  { id: 'orders-validate', name: 'Validation commande', description: 'Notification lors de la validation d\'une commande', module: 'ORDERS', actionType: 'VALIDATE', defaultEnabled: true, severity: 'high' },
  
  // SYSTEM module
  { id: 'system-backup', name: 'Sauvegarde système', description: 'Notification lors des sauvegardes système', module: 'SYSTEM', actionType: 'BACKUP', defaultEnabled: true, severity: 'low' },
  { id: 'system-error', name: 'Erreur système', description: 'Notification lors d\'erreurs système', module: 'SYSTEM', actionType: 'ERROR', defaultEnabled: true, severity: 'critical' },
];

const USER_ROLES = ['ADMIN', 'TEACHER', 'STUDENT', 'GUEST', 'LABORANTIN', 'ADMINLABO'];

export class NotificationPreferencesService {
  
  async initializeDefaultPreferences(): Promise<void> {
    console.log('[NotificationPreferencesService] 🚀 Début de l\'initialisation...');
    
    // Initialiser les configurations
    await this.initializeConfigs();
    
    // Initialiser les préférences
    await this.initializePreferences();
    
    console.log('[NotificationPreferencesService] ✅ Initialisation terminée.');
  }
  
  private async initializeConfigs(): Promise<void> {
    console.log('[NotificationPreferencesService] Initialisation des configurations...');
    
    let existingConfigs: NotificationConfig[] = [];
    
    // Lire les configurations existantes
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      existingConfigs = parsed.configs || [];
      console.log(`[NotificationPreferencesService] ${existingConfigs.length} configurations existantes trouvées.`);
    } catch (error) {
      console.log('[NotificationPreferencesService] Aucune configuration existante trouvée.');
    }
    
    // Identifier les configurations manquantes
    const missingConfigs: NotificationConfig[] = [];
    
    for (const defaultConfig of DEFAULT_CONFIGS) {
      const exists = existingConfigs.some(config => config.id === defaultConfig.id);
      if (!exists) {
        missingConfigs.push(defaultConfig);
      }
    }
    
    if (missingConfigs.length > 0) {
      console.log(`[NotificationPreferencesService] ${missingConfigs.length} configurations manquantes détectées.`);
      
      // Fusionner les configurations
      const allConfigs = [...existingConfigs, ...missingConfigs];
      await this.writeConfigs(allConfigs);
      
      console.log(`[NotificationPreferencesService] ${missingConfigs.length} nouvelles configurations ajoutées.`);
    } else {
      console.log('[NotificationPreferencesService] Toutes les configurations sont déjà présentes.');
    }
  }
  
  private async initializePreferences(): Promise<void> {
    console.log('[NotificationPreferencesService] Initialisation des préférences...');
    
    let existingPreferences: NotificationPreference[] = [];
    
    // Lire les préférences existantes
    try {
      const data = await fs.readFile(PREFERENCES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      existingPreferences = parsed.preferences || [];
      console.log(`[NotificationPreferencesService] ${existingPreferences.length} préférences existantes trouvées.`);
    } catch (error) {
      console.log('[NotificationPreferencesService] Aucune préférence existante trouvée.');
    }
    
    // Identifier les préférences manquantes
    const missingPreferences: NotificationPreference[] = [];
    
    for (const role of USER_ROLES) {
      for (const config of DEFAULT_CONFIGS) {
        const preferenceId = `${role}-${config.id}`;
        const exists = existingPreferences.some(pref => pref.id === preferenceId);
        
        if (!exists) {
          missingPreferences.push({
            id: preferenceId,
            role,
            module: config.module,
            actionType: config.actionType,
            enabled: config.defaultEnabled,
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
  
  async getPreferences(): Promise<NotificationPreference[]> {
    try {
      const data = await fs.readFile(PREFERENCES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed.preferences || [];
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
  
  async getConfigs(): Promise<NotificationConfig[]> {
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed.configs || DEFAULT_CONFIGS;
    } catch (error) {
      console.error('Error reading notification configs:', error);
      return DEFAULT_CONFIGS;
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
    
    const data = { preferences };
    await fs.writeFile(PREFERENCES_FILE, JSON.stringify(data, null, 2));
    console.log('[NotificationPreferencesService] Préférences enregistrées dans le fichier.');
  }
  
  private async writeConfigs(configs: NotificationConfig[]): Promise<void> {
    // Créer le dossier data s'il n'existe pas
    const dataDir = path.dirname(CONFIG_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
      console.log('[NotificationPreferencesService] Dossier data créé.');
    }
    
    const data = { configs };
    await fs.writeFile(CONFIG_FILE, JSON.stringify(data, null, 2));
    console.log('[NotificationPreferencesService] Configurations enregistrées dans le fichier.');
  }
  
  // Méthode pour forcer la réinitialisation complète
  async forceReset(): Promise<void> {
    console.log('[NotificationPreferencesService] 🔄 Réinitialisation forcée...');
    
    try {
      // Supprimer les fichiers existants
      await fs.unlink(CONFIG_FILE).catch(() => {});
      await fs.unlink(PREFERENCES_FILE).catch(() => {});
      console.log('[NotificationPreferencesService] Fichiers existants supprimés.');
      
      // Recréer avec les valeurs par défaut
      await this.writeConfigs(DEFAULT_CONFIGS);
      
      const defaultPreferences: NotificationPreference[] = [];
      for (const role of USER_ROLES) {
        for (const config of DEFAULT_CONFIGS) {
          defaultPreferences.push({
            id: `${role}-${config.id}`,
            role,
            module: config.module,
            actionType: config.actionType,
            enabled: config.defaultEnabled,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      await this.writePreferences(defaultPreferences);
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
    console.log('🚀 Initialisation du système de notifications...');
    
    const service = new NotificationPreferencesService();
    
    if (forceReset) {
      console.log('⚠️  Mode réinitialisation forcée activé...');
      await service.forceReset();
    } else {
      await service.initializeDefaultPreferences();
    }
    
    // Afficher un résumé
    const preferences = await service.getPreferences();
    const configs = await service.getConfigs();
    
    console.log('\n📊 Résumé de l\'initialisation:');
    console.log(`   ✅ ${configs.length} configurations de notifications disponibles`);
    console.log(`   ✅ ${preferences.length} préférences utilisateur configurées`);
    
    console.log('\n📋 Préférences par rôle:');
    for (const role of USER_ROLES) {
      const rolePreferences = preferences.filter(p => p.role === role);
      const enabledCount = rolePreferences.filter(p => p.enabled).length;
      console.log(`   ${role}: ${enabledCount}/${rolePreferences.length} notifications activées`);
    }
    
    console.log('\n📝 Configurations disponibles par module:');
    const configsByModule = configs.reduce((acc, config) => {
      acc[config.module] = (acc[config.module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(configsByModule).forEach(([module, count]) => {
      console.log(`   ${module}: ${count} types de notifications`);
    });
    
    console.log('\n🎉 Système de notifications initialisé avec succès!');
    
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