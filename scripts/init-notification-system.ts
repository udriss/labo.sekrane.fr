#!/usr/bin/env tsx

import { notificationConfigService } from '../lib/services/NotificationConfigService';

async function initializeNotificationSystem() {
  try {
    console.log('🚀 Initialisation du système de notifications en base de données dans "scripts/init-notification-system.ts"...');
    
    // Initialiser les configurations par défaut
    console.log('\n📋 Initialisation des configurations de notifications...');
    await notificationConfigService.initializeDefaultConfigs();
    
    // Récupérer les statistiques pour vérification
    const stats = await notificationConfigService.getStats();
    const configs = await notificationConfigService.getAllConfigs();
    
    console.log('\n📊 Résumé de l\'initialisation:');
    console.log(`   ✅ ${stats.totalConfigs} configurations totales`);
    console.log(`   ✅ ${stats.enabledConfigs} configurations activées`);
    console.log(`   ✅ ${stats.totalPreferences} préférences utilisateur`);
    
    console.log('\n📝 Configurations par module:');
    const configsByModule = configs.reduce((acc, config) => {
      acc[config.module] = (acc[config.module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(configsByModule).forEach(([module, count]) => {
      console.log(`   ${module}: ${count} types de notifications`);
    });
    
    console.log('\n🎯 Rôles par défaut par module:');
    const rolesByModule = configs.reduce((acc, config) => {
      if (!acc[config.module]) acc[config.module] = new Set();
      config.defaultRoles.forEach(role => acc[config.module].add(role));
      return acc;
    }, {} as Record<string, Set<string>>);
    
    Object.entries(rolesByModule).forEach(([module, roles]) => {
      console.log(`   ${module}: ${Array.from(roles).join(', ')}`);
    });
    
    if (stats.totalPreferences > 0) {
      console.log('\n👥 Préférences par rôle:');
      Object.entries(stats.preferencesByRole).forEach(([role, count]) => {
        console.log(`   ${role}: ${count} préférences`);
      });
    }
    
    console.log('\n🎉 Système de notifications initialisé avec succès!');
    
    // Fermer la connexion
    await notificationConfigService.closeConnection();
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation du système de notifications:', error);
    process.exit(1);
  }
}

// Exécuter l'initialisation
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeNotificationSystem()
    .then(() => {
      console.log('✅ Initialisation terminée');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Échec de l\'initialisation:', error);
      process.exit(1);
    });
}

export { initializeNotificationSystem };
