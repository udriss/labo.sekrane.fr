// api/test-all-modules/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { notificationService } from '@/lib/services/notification-service';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { module, actionType } = body;

    if (!module || !actionType) {
      // Tester tous les modules avec leurs actions principales
      const testCases = [
        // USERS
        { module: 'USERS', actionType: 'CREATE', message: '👤 Test: Nouvel utilisateur ajouté' },
        { module: 'USERS', actionType: 'UPDATE', message: '👤 Test: Profil utilisateur modifié' },
        { module: 'USERS', actionType: 'STATUS', message: '👤 Test: Rôle utilisateur changé' },

        // CHEMICALS
        {
          module: 'CHEMICALS',
          actionType: 'CREATE',
          message: '🧪 Test: Nouveau produit chimique ajouté',
        },
        { module: 'CHEMICALS', actionType: 'ALERT', message: '🧪 Test: Stock faible détecté' },

        // MATERIEL
        { module: 'MATERIEL', actionType: 'CREATE', message: '🔧 Test: Nouveau matériel ajouté' },
        { module: 'MATERIEL', actionType: 'ALERT', message: '🔧 Test: Alerte stock matériel' },

        // ROOMS
        { module: 'ROOMS', actionType: 'CREATE', message: '🏠 Test: Nouvelle salle ajoutée' },
        { module: 'ROOMS', actionType: 'STATUS', message: '🏠 Test: Disponibilité salle modifiée' },

        // CALENDAR
        { module: 'CALENDAR', actionType: 'CREATE', message: '📅 Test: Nouvel événement ajouté' },
        { module: 'CALENDAR', actionType: 'ALERT', message: '📅 Test: Rappel événement' },

        // ORDERS
        { module: 'ORDERS', actionType: 'CREATE', message: '📦 Test: Nouvelle commande ajoutée' },
        { module: 'ORDERS', actionType: 'ALERT', message: '📦 Test: Commande urgente' },

        // SECURITY
        { module: 'SECURITY', actionType: 'ALERT', message: '🔒 Test: Alerte sécurité' },
        { module: 'SECURITY', actionType: 'REPORT', message: '🔒 Test: Rapport de sécurité' },

        // SYSTEM
        { module: 'SYSTEM', actionType: 'ALERT', message: '⚙️ Test: Alerte système' },
        { module: 'SYSTEM', actionType: 'STATUS', message: '⚙️ Test: Statut système modifié' },
      ];

      const results = [];

      for (const testCase of testCases) {
        try {
          const result = await notificationService.createAndDispatch({
            ...testCase,
            data: {
              testId: Date.now() + Math.random(),
              triggeredBy: session?.user?.name || session?.user?.email || 'test-système',
              testTimestamp: new Date().toISOString(),
            },
          });

          results.push({
            ...testCase,
            success: !!result,
            notificationId: result?.id,
          });
        } catch (error) {
          results.push({
            ...testCase,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return NextResponse.json({
        message: 'Test de tous les modules terminé',
        results,
        summary: {
          total: results.length,
          success: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
        },
      });
    } else {
      // Tester un module spécifique
      const result = await notificationService.createAndDispatch({
        module,
        actionType,
        message: `🧪 Test: ${module}.${actionType}`,
        data: {
          testId: Date.now(),
          triggeredBy: session?.user?.name || session?.user?.email || 'test-système',
          testTimestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        message: 'Test spécifique terminé',
        success: !!result,
        notification: result,
      });
    }
  } catch (error) {
    console.error('Erreur lors du test des notifications:', error);
    return NextResponse.json({ error: 'Failed to test notifications' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'API de test pour tous les modules de notifications',
    usage: {
      'POST /api/test-all-modules': 'Teste tous les modules',
      'POST /api/test-all-modules { module: "USERS", actionType: "CREATE" }':
        'Teste un module spécifique',
    },
    availableModules: [
      'USERS',
      'CHEMICALS',
      'MATERIEL',
      'ROOMS',
      'CALENDAR',
      'ORDERS',
      'SECURITY',
      'SYSTEM',
    ],
    availableActionTypes: ['CREATE', 'UPDATE', 'DELETE', 'SYNC', 'ALERT', 'STATUS', 'REPORT'],
  });
}
