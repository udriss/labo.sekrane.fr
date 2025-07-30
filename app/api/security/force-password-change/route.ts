export const runtime = 'nodejs';

import { prisma } from '@/lib/db/prisma'; // Assuming prisma is set up for database interaction
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

interface User {
  id: string;
  email: string;
}

export async function POST() {
  try {
    // Fetch all users from the database
    const users = await prisma.user.findMany();

    // Generate new hashed passwords for all users
    const updatedUsers = await Promise.all(
      users.map(async (user: User) => {
        const newPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password in the database
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });

        return { email: user.email, newPassword };
      })
    );

    // Optionally, send emails to users with their new passwords
    // await sendPasswordChangeEmails(updatedUsers);

    return NextResponse.json({
      message: 'Changement de mots de passe forcé avec succès.',
      updatedUsers,
    });
  } catch (error) {
    console.error('Erreur lors du changement de mots de passe:', error);
    return NextResponse.json({ error: 'Erreur lors du changement de mots de passe' }, { status: 500 });
  }
}

function generateRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Uncomment and implement this function if email notifications are required
// async function sendPasswordChangeEmails(users) {
//   for (const user of users) {
//     await sendEmail({
//       to: user.email,
//       subject: 'Votre mot de passe a été réinitialisé',
//       text: `Votre nouveau mot de passe est : ${user.newPassword}`,
//     });
//   }
// }
