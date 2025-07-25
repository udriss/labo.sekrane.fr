// scripts/init-logs.ts
import { auditLogger } from '@/lib/services/audit-logger';
import path from 'path';
import { promises as fs } from 'fs';

async function initializeLogs() {
  console.log('Initialisation du système de logs...');
  
  try {
    // Créer les répertoires nécessaires
    const baseDir = path.join(process.cwd(), 'logs');
    const dirs = [
      baseDir,
      path.join(baseDir, 'archives'),
      path.join(baseDir, 'indexes'),
      path.join(baseDir, new Date().getFullYear().toString()),
      path.join(baseDir, new Date().getFullYear().toString(), String(new Date().getMonth() + 1).padStart(2, '0'))
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✓ Répertoire créé/vérifié: ${dir}`);
    }

    // Créer l'index principal s'il n'existe pas
    const indexPath = path.join(baseDir, 'indexes', 'main-index.json');
    try {
      await fs.access(indexPath);
      console.log('✓ Index principal existe déjà');
    } catch {
      const emptyIndex = {
        users: {},
        modules: {},
        actions: {},
        dates: {}
      };
      await fs.writeFile(indexPath, JSON.stringify(emptyIndex, null, 2));
      console.log('✓ Index principal créé');
    }

    // Créer un log de démarrage
    await auditLogger.log(
      {
        type: 'READ',
        module: 'SYSTEM',
        entity: 'startup',
        entityId: undefined
      },
      {
        id: 'system',
        email: 'system@labolims.com',
        name: 'System',
        role: 'SYSTEM'
      },
      {
        ip: '127.0.0.1',
        userAgent: 'System Initialization',
        requestId: `init_${Date.now()}`,
        path: '/system/init',
        method: 'SYSTEM'
      },
      {
        message: 'Système de logs initialisé',
        version: '1.0.0'
      }
    );

    await auditLogger.forceFlush();
    console.log('✓ Log de démarrage créé');
    console.log('✅ Initialisation terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  initializeLogs();
}

export { initializeLogs };


// npx tsx scripts/init-logs.ts