import { initializeNotificationSystem } from './init-notification-system';

// Fonction d'initialisation standalone mise à jour pour utiliser MySQL
async function initializeNotificationPreferences(forceReset: boolean = false) {
  try {
    console.log('🚀 Initialisation du système de notifications basé sur MySQL...');
    
    if (forceReset) {
      console.log('⚠️  Mode réinitialisation forcée activé...');
      // La réinitialisation sera gérée par le service
    }
    
    await initializeNotificationSystem();
    
    console.log('\n🎉 Système de notifications MySQL initialisé avec succès!');
    console.log('\n📁 Système de stockage:');
    console.log('   📄 Base de données MySQL (notification_configs, notification_preferences, notification_history)');
    console.log('   📄 Fichiers JSON (compatibilité et fallback)');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation du système de notifications:', error);
    throw error;
  }
}

// Exporter pour compatibilité avec l'ancien système
export class NotificationPreferencesService {
  async initializeDefaultPreferences(): Promise<void> {
    console.log('⚠️  DEPRECATED: Utilisation de la méthode legacy. Utilisez initializeNotificationSystem() à la place.');
    await initializeNotificationSystem();
  }
  
  async forceReset(): Promise<void> {
    console.log('⚠️  DEPRECATED: Utilisation de la méthode legacy. Utilisez initializeNotificationSystem() à la place.');
    await initializeNotificationSystem();
  }
}

export const notificationPreferencesService = new NotificationPreferencesService();

// Exécuter l'initialisation si ce fichier est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  // Vérifier si l'argument --force-reset est passé
  const forceReset = process.argv.includes('--force-reset');
  
  initializeNotificationPreferences(forceReset)
    .then(() => {
      console.log('✅ Initialisation terminée');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Échec de l\'initialisation:', error);
      process.exit(1);
    });
}
