import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(process.cwd(), 'data');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const PREFERENCES_FILE = path.join(DATA_DIR, 'notification-preferences.json');
const CONFIGS_FILE = path.join(DATA_DIR, 'notification-configs.json');

export async function initializeDataFolders() {
  try {
    console.log('🚀 Initialisation des dossiers de données...');
    
    // Créer le dossier data s'il n'existe pas
    try {
      await fs.access(DATA_DIR);
      console.log('✅ Dossier data existe déjà');
    } catch {
      await fs.mkdir(DATA_DIR, { recursive: true });
      console.log('✅ Dossier data créé');
    }

    // Initialiser le fichier des notifications
    try {
      await fs.access(NOTIFICATIONS_FILE);
      console.log('✅ Fichier notifications.json existe déjà');
    } catch {
      await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify({ notifications: [] }, null, 2));
      console.log('✅ Fichier notifications.json créé');
    }

    // Initialiser le fichier des préférences
    try {
      await fs.access(PREFERENCES_FILE);
      console.log('✅ Fichier notification-preferences.json existe déjà');
    } catch {
      await fs.writeFile(PREFERENCES_FILE, JSON.stringify({ preferences: [] }, null, 2));
      console.log('✅ Fichier notification-preferences.json créé');
    }

    // Initialiser le fichier des configurations
    try {
      await fs.access(CONFIGS_FILE);
      console.log('✅ Fichier notification-configs.json existe déjà');
    } catch {
      await fs.writeFile(CONFIGS_FILE, JSON.stringify({ configs: [] }, null, 2));
      console.log('✅ Fichier notification-configs.json créé');
    }

    console.log('🎉 Initialisation des dossiers de données terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des dossiers de données:', error);
    throw error;
  }
}

// Exécuter l'initialisation si ce fichier est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDataFolders()
    .then(() => {
      console.log('✅ Initialisation terminée');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Échec de l\'initialisation:', error);
      process.exit(1);
    });
}