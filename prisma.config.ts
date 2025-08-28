// prisma.config.ts
// Prisma (v6.x) détecte ce fichier et désactive le chargement automatique de .env.
// On réintroduit ici un chargement manuel pour éviter l'erreur "Environment variable not found: DATABASE_URL".
// Priorité: .env.local > .env.development (si NODE_ENV=development) > .env
// Constat: présence de prisma.config.ts désactive le chargement automatique des .env par Prisma CLI (d’où l’erreur).

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';

// sourcer .env.local ou .env si DATABASE_URL absent avant d’appeler Prisma
function ensureEnvLoaded() {
  if (process.env.DATABASE_URL) return;
  const candidates = [
    '.env.local',
    process.env.NODE_ENV === 'development' ? '.env.development' : undefined,
    '.env',
  ].filter(Boolean) as string[];
  for (const file of candidates) {
    if (existsSync(file)) {
      loadEnv({ path: file });
      if (process.env.DATABASE_URL) break;
    }
  }
}

ensureEnvLoaded();

// Export minimal config object (placeholder for future explicit config when Prisma 7 lands)
export default {};
