// lib/migrations/removeUserCustomClasses.ts

import { withConnection } from '../db';

/**
 * Migration pour supprimer la colonne customClasses de la table users
 * et migrer les données vers la table classes
 */
export async function removeUserCustomClasses(): Promise<void> {
  await withConnection(async (connection) => {
    console.log('🔄 Début de la migration: suppression de users.customClasses');

    try {
      // Vérifier si la colonne customClasses existe
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'customClasses'
      `);

      if ((columns as any[]).length === 0) {
        console.log('ℹ️  La colonne customClasses n\'existe pas dans la table users');
        return;
      }

      // Migrer les données existantes vers la table classes
      console.log('🔄 Migration des classes personnalisées existantes...');
      
      const [users] = await connection.execute(`
        SELECT id, email, name, customClasses 
        FROM users 
        WHERE customClasses IS NOT NULL AND customClasses != ''
      `);

      const usersList = users as Array<{
        id: string;
        email: string;
        name: string;
        customClasses: string;
      }>;

      for (const user of usersList) {
        try {
          // Parser les classes personnalisées (assumant un format JSON)
          let customClasses: string[] = [];
          
          try {
            customClasses = JSON.parse(user.customClasses);
          } catch {
            // Si ce n'est pas du JSON, essayer de séparer par virgule
            customClasses = user.customClasses.split(',').map(c => c.trim()).filter(c => c);
          }

          // Insérer chaque classe personnalisée dans la table classes
          for (const className of customClasses) {
            if (className) {
              const classId = `CLASS_CUSTOM_${Date.now()}_${user.id}_${className.replace(/\s+/g, '_')}`;
              
              await connection.execute(`
                INSERT IGNORE INTO classes (id, name, type, created_by, user_id, user_email)
                VALUES (?, ?, 'custom', ?, ?, ?)
              `, [classId, className, user.name || user.email, user.id, user.email]);
            }
          }

          console.log(`✅ Migré ${customClasses.length} classe(s) pour l'utilisateur ${user.email}`);
        } catch (error) {
          console.error(`❌ Erreur lors de la migration pour l'utilisateur ${user.email}:`, error);
        }
      }

      // Supprimer la colonne customClasses
      console.log('🔄 Suppression de la colonne customClasses...');
      await connection.execute(`
        ALTER TABLE users DROP COLUMN customClasses
      `);

      console.log('✅ Migration terminée: colonne customClasses supprimée de la table users');

    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error);
      throw error;
    }
  });
}
