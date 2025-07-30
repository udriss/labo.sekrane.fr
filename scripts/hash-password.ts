// scripts/hash-password.ts
import bcrypt from 'bcryptjs';

async function hashPassword(password: string) {
  const hash = await bcrypt.hash(password, 12);
  
  
}

// Exemple d'utilisation
hashPassword('admin123').then(() => process.exit(0));

// npx tsx scripts/hash-password.ts