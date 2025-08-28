// Nouveau orchestrateur minimal s'appuyant sur le script unifié seed-all.ts
// Ancienne logique conservée plus bas en fallback si besoin (commentée) dans l'historique git.
import { PrismaClient } from '@prisma/client';
import { runUnifiedSeed } from './seed-all';

const prisma = new PrismaClient();

async function run() {
  console.log('🚀 Orchestrator (unifié) start');
  await runUnifiedSeed();
  console.log('✅ Orchestrator terminé');
}

if (require.main === module) {
  run()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

export { run as seedAll };
