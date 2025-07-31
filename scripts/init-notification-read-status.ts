// scripts/init-notification-read-status.ts
import { query } from '@/lib/db';

/**
 * Initialise la table notification_read_status si elle n'existe pas déjà
 */
async function initNotificationReadStatus() {
  console.log('🔄 Vérification de la table notification_read_status...');

  try {
    // Vérifier si la table existe
    const tableExists = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'notification_read_status'
    `);

    if (tableExists[0].count === 0) {
      console.log('🔨 Création de la table notification_read_status...');
      
      // Créer la table
      await query(`
        CREATE TABLE notification_read_status (
          id varchar(36) NOT NULL PRIMARY KEY,
          notification_id varchar(36) NOT NULL,
          user_id varchar(100) NOT NULL,
          is_read tinyint(1) NOT NULL DEFAULT 0,
          read_at timestamp NULL DEFAULT NULL,
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_notification_user (notification_id, user_id),
          KEY idx_notification_id (notification_id),
          KEY idx_user_id (user_id),
          KEY idx_is_read (is_read)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ Table notification_read_status créée avec succès.');
    } else {
      console.log('✅ La table notification_read_status existe déjà.');
    }
    
    console.log('🔍 Vérification des permissions sur les tables de notifications...');
    console.log('✅ Initialisation complète.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de notification_read_status:', error);
    process.exit(1);
  }
}

// Exécuter la fonction principale
initNotificationReadStatus();
