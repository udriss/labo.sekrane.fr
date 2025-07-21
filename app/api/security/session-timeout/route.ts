import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simulate session timeout configuration
    const timeout = 30; // Replace with actual logic if needed
    return NextResponse.json({ timeout });
  } catch (error) {
    console.error('Erreur lors de la configuration du timeout des sessions:', error);
    return NextResponse.json({ error: 'Erreur lors de la configuration du timeout des sessions' }, { status: 500 });
  }
}
