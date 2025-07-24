import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { promises as fs } from 'fs';
import path from 'path';
import { authOptions } from '@/lib/auth'; // Ajustez selon votre configuration

interface ActiveSession {
  lastActivity: string;
  userName: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    // Obtenir des infos supplémentaires depuis la requête
    const headers = request.headers;
    const ipAddress = headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown';
    const userAgent = headers.get('user-agent') || 'unknown';

    // Créer le dossier data s'il n'existe pas
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // Chemin du fichier de sessions
    const sessionsPath = path.join(dataDir, 'active-sessions.json');
    
    let sessions: Record<string, ActiveSession> = {};
    
    // Lire les sessions existantes
    try {
      const data = await fs.readFile(sessionsPath, 'utf-8');
      sessions = JSON.parse(data);
    } catch {
      // Le fichier n'existe pas encore, on continue avec un objet vide
    }

    // Mettre à jour la session de l'utilisateur
    sessions[session.user.email] = {
      lastActivity: new Date().toISOString(),
      userName: session.user.name || 'Unknown',
      userRole: (session.user as any).role || 'USER',
      ipAddress: ipAddress.toString(),
      userAgent: userAgent.substring(0, 100), // Limiter la taille
    };

    // Nettoyer les sessions expirées (plus de 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const activeSessions: Record<string, ActiveSession> = {};
    
    Object.entries(sessions).forEach(([email, data]) => {
      if (new Date(data.lastActivity) > thirtyMinutesAgo) {
        activeSessions[email] = data;
      }
    });

    // Sauvegarder les sessions actives
    await fs.writeFile(
      sessionsPath, 
      JSON.stringify(activeSessions, null, 2),
      'utf-8'
    );

    // Statistiques sur les sessions
    const sessionStats = {
      total: Object.keys(activeSessions).length,
      byRole: {} as Record<string, number>,
    };

    // Compter par rôle
    Object.values(activeSessions).forEach(session => {
      const role = session.userRole || 'USER';
      sessionStats.byRole[role] = (sessionStats.byRole[role] || 0) + 1;
    });

    return NextResponse.json({ 
      success: true, 
      activeUsers: sessionStats.total,
      stats: sessionStats,
      currentUser: session.user.email,
    });
  } catch (error) {
    console.error('Erreur tracking activité:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Endpoint GET optionnel pour récupérer les stats sans mettre à jour
export async function GET() {
  try {
    const sessionsPath = path.join(process.cwd(), 'data', 'active-sessions.json');
    const data = await fs.readFile(sessionsPath, 'utf-8');
    const sessions = JSON.parse(data);
    
    // Nettoyer les sessions expirées
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const activeSessions = Object.entries(sessions).filter(([_, data]: [string, any]) => {
      return new Date(data.lastActivity) > thirtyMinutesAgo;
    });

    return NextResponse.json({
      activeUsers: activeSessions.length,
      sessions: activeSessions.map(([email, data]: [string, any]) => ({
        email,
        userName: data.userName,
        role: data.userRole,
        lastActivity: data.lastActivity,
      })),
    });
  } catch (error) {
    return NextResponse.json({ activeUsers: 0, sessions: [] });
  }
}