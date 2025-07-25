// scripts/testAuth.ts
import { UserService } from '../lib/services/userService';

async function testAuth() {
  const testCases = [
    { email: 'admin@labo.fr', password: 'admin123' },
    { email: 'teacher@labo.fr', password: 'teacher123' },
    { email: 'student@labo.fr', password: 'student123' }
  ];

  for (const { email, password } of testCases) {
    try {
      const user = await UserService.verifyPassword(email, password);
      if (user) {
        console.log(`✅ Connexion réussie pour ${email} (${user.role})`);
      } else {
        console.log(`❌ Échec de connexion pour ${email}`);
      }
    } catch (error) {
      console.error(`❌ Erreur pour ${email}:`, error);
    }
  }
}

testAuth();


// npx tsx scripts/testAuth.ts