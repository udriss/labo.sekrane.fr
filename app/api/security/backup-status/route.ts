import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simulate fetching backup status
    const lastBackup = '2025-07-20'; // Replace with actual logic if needed
    return NextResponse.json({ lastBackup });
  } catch (error) {
    console.error('Erreur lors de la vérification des sauvegardes:', error);
    return NextResponse.json({ error: 'Erreur lors de la vérification des sauvegardes' }, { status: 500 });
  }
}
