import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface NotificationPreference {
  id: string;
  role: string;
  module: string;
  actionType: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const PREFERENCES_FILE = '/var/www/labo.sekrane.fr/data/notification-preferences.json';

// Lire les préférences depuis le fichier JSON
async function readPreferences(): Promise<NotificationPreference[]> {
  try {
    if (!fs.existsSync(PREFERENCES_FILE)) {
      console.warn(`Fichier préférences non trouvé: ${PREFERENCES_FILE}`);
      return [];
    }

    const rawContent = fs.readFileSync(PREFERENCES_FILE, 'utf8');
    if (!rawContent.trim()) {
      console.warn('Fichier préférences vide');
      return [];
    }

    const preferences = JSON.parse(rawContent) as NotificationPreference[];
    console.log(`✅ ${preferences.length} préférences lues depuis le fichier`);
    
    return preferences;
  } catch (error) {
    console.error('Erreur lors de la lecture des préférences:', error);
    return [];
  }
}

// Écrire les préférences dans le fichier JSON
async function writePreferences(preferences: NotificationPreference[]): Promise<boolean> {
  try {
    // S'assurer que le dossier existe
    const dir = path.dirname(PREFERENCES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Écrire le fichier avec une indentation propre
    const content = JSON.stringify(preferences, null, 2);
    fs.writeFileSync(PREFERENCES_FILE, content, 'utf8');
    
    console.log(`✅ ${preferences.length} préférences écrites dans le fichier`);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'écriture des préférences:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = session.user as any;
    if (!user.role || !['ADMIN', 'ADMINLABO'].includes(user.role)) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    console.log('🔧 [ADMIN] Récupération des préférences de notifications');

    // Lire les préférences
    const preferences = await readPreferences();

    // Organiser par rôle pour faciliter l'affichage
    const preferencesByRole: Record<string, NotificationPreference[]> = {};
    preferences.forEach(pref => {
      if (!preferencesByRole[pref.role]) {
        preferencesByRole[pref.role] = [];
      }
      preferencesByRole[pref.role].push(pref);
    });

    // Calculer les statistiques
    const stats = {
      total: preferences.length,
      byRole: Object.keys(preferencesByRole).reduce((acc, role) => {
        acc[role] = {
          total: preferencesByRole[role].length,
          enabled: preferencesByRole[role].filter(p => p.enabled).length
        };
        return acc;
      }, {} as Record<string, { total: number; enabled: number }>)
    };

    return NextResponse.json({
      success: true,
      preferences,
      preferencesByRole,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🔧 [ADMIN] Erreur lors de la récupération des préférences:', error);
    return NextResponse.json({
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = session.user as any;
    if (!user.role || !['ADMIN', 'ADMINLABO'].includes(user.role)) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const body = await request.json();
    const { role, updates } = body;

    if (!role || !updates || !Array.isArray(updates)) {
      return NextResponse.json({
        error: 'Paramètres invalides. Requis: role (string), updates (array)'
      }, { status: 400 });
    }

    console.log('🔧 [ADMIN] Mise à jour des préférences pour le rôle:', role);
    console.log('🔧 [ADMIN] Nombre de mises à jour:', updates.length);

    // Lire les préférences existantes
    const existingPreferences = await readPreferences();

    // Créer un map des préférences existantes pour ce rôle
    const existingByKey = new Map<string, NotificationPreference>();
    existingPreferences.forEach(pref => {
      if (pref.role === role) {
        const key = `${pref.module}-${pref.actionType}`;
        existingByKey.set(key, pref);
      }
    });

    // Traiter les mises à jour
    const updatedPreferences = [...existingPreferences.filter(p => p.role !== role)];
    const now = new Date().toISOString();

    updates.forEach((update: { module: string; actionType: string; enabled: boolean }) => {
      const key = `${update.module}-${update.actionType}`;
      const existing = existingByKey.get(key);

      if (existing) {
        // Mettre à jour la préférence existante
        updatedPreferences.push({
          ...existing,
          enabled: update.enabled,
          updatedAt: now
        });
      } else {
        // Créer une nouvelle préférence
        updatedPreferences.push({
          id: uuidv4(),
          role,
          module: update.module,
          actionType: update.actionType,
          enabled: update.enabled,
          createdAt: now,
          updatedAt: now
        });
      }
    });

    // Sauvegarder les préférences mises à jour
    const success = await writePreferences(updatedPreferences);

    if (!success) {
      return NextResponse.json({
        error: 'Erreur lors de la sauvegarde des préférences'
      }, { status: 500 });
    }

    console.log('✅ [ADMIN] Préférences mises à jour avec succès pour le rôle:', role);

    return NextResponse.json({
      success: true,
      message: `Préférences mises à jour pour le rôle ${role}`,
      updatedCount: updates.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🔧 [ADMIN] Erreur lors de la mise à jour des préférences:', error);
    return NextResponse.json({
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = session.user as any;
    if (!user.role || !['ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'reset-defaults') {
      console.log('🔧 [ADMIN] Réinitialisation des préférences par défaut');

      // Définir les préférences par défaut
      const defaultPreferences: NotificationPreference[] = [
        // ADMIN - Accès à tout
        { id: uuidv4(), role: 'ADMIN', module: 'SYSTEM', actionType: 'MAINTENANCE', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: uuidv4(), role: 'ADMIN', module: 'USERS', actionType: 'NEW_USER_REGISTRATION', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: uuidv4(), role: 'ADMIN', module: 'SECURITY', actionType: 'SECURITY_ALERT', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: uuidv4(), role: 'ADMIN', module: 'ORDERS', actionType: 'ORDER_DELIVERED', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: uuidv4(), role: 'ADMIN', module: 'CALENDAR', actionType: 'EVENT_CREATED', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        
        // ADMINLABO - Gestion du laboratoire
        { id: uuidv4(), role: 'ADMINLABO', module: 'CHEMICALS', actionType: 'STOCK_LOW', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: uuidv4(), role: 'ADMINLABO', module: 'EQUIPMENT', actionType: 'MAINTENANCE_DUE', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: uuidv4(), role: 'ADMINLABO', module: 'ORDERS', actionType: 'ORDER_DELIVERED', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        
        // TEACHER - Enseignement
        { id: uuidv4(), role: 'TEACHER', module: 'CALENDAR', actionType: 'EVENT_CREATED', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: uuidv4(), role: 'TEACHER', module: 'ROOMS', actionType: 'ROOM_RESERVED', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: uuidv4(), role: 'TEACHER', module: 'CHEMICALS', actionType: 'STOCK_LOW', enabled: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        
        // LABORANTIN - Maintenance et stocks
        { id: uuidv4(), role: 'LABORANTIN', module: 'EQUIPMENT', actionType: 'MAINTENANCE_DUE', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: uuidv4(), role: 'LABORANTIN', module: 'CHEMICALS', actionType: 'STOCK_LOW', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: uuidv4(), role: 'LABORANTIN', module: 'ROOMS', actionType: 'ROOM_RESERVED', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        
        // GUEST - Accès minimal
        { id: uuidv4(), role: 'GUEST', module: 'CALENDAR', actionType: 'EVENT_CREATED', enabled: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: uuidv4(), role: 'GUEST', module: 'SYSTEM', actionType: 'MAINTENANCE', enabled: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];

      const success = await writePreferences(defaultPreferences);

      if (!success) {
        return NextResponse.json({
          error: 'Erreur lors de la réinitialisation des préférences'
        }, { status: 500 });
      }

      console.log('✅ [ADMIN] Préférences par défaut réinitialisées');

      return NextResponse.json({
        success: true,
        message: 'Préférences par défaut réinitialisées',
        defaultsCount: defaultPreferences.length,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      error: 'Action non supportée'
    }, { status: 400 });

  } catch (error) {
    console.error('🔧 [ADMIN] Erreur lors de l\'action POST:', error);
    return NextResponse.json({
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}