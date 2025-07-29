// scripts/init-logs.ts
import { auditLogger } from '@/lib/services/audit-logger';
import path from 'path';
import { promises as fs } from 'fs';

async function initializeLogs() {
  
  
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
      
    }

    // Créer l'index principal s'il n'existe pas
    const indexPath = path.join(baseDir, 'indexes', 'main-index.json');
    try {
      await fs.access(indexPath);
      
    } catch {
      const emptyIndex = {
        users: {},
        modules: {},
        actions: {},
        dates: {}
      };
      await fs.writeFile(indexPath, JSON.stringify(emptyIndex, null, 2));
      
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