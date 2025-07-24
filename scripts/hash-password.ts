// scripts/hash-password.ts
import bcrypt from 'bcryptjs';

async function hashPassword(password: string) {
  const hash = await bcrypt.hash(password, 12);
  console.log(`Mot de passe: ${password}`);
  console.log(`Hash: ${hash}`);
}

// Exemple d'utilisation
hashPassword('admin123').then(() => process.exit(0));

// npx tsx scripts/hash-password.ts