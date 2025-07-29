import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NotificationsContentAnalyzer } from '@/lib/debug/notifications-content-analyzer';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = session.user as any;
    const { searchParams } = new URL(request.url);
    
    const action = searchParams.get('action') || 'analyze';
    const testUserId = searchParams.get('testUserId') || user.id;
    const testUserEmail = searchParams.get('testUserEmail') || user.email;

    console.log('🔍 [ANALYZE] Début de l\'analyse du contenu notifications');
    console.log('🔍 [ANALYZE] Utilisateur:', { id: user.id, email: user.email, role: user.role });
    console.log('🔍 [ANALYZE] Test params:', { testUserId, testUserEmail, action });

    switch (action) {
      case 'analyze':
        const analysis = await NotificationsContentAnalyzer.analyzeForUser(testUserId, testUserEmail);
        
        return NextResponse.json({
          action: 'analyze',
          testParams: { testUserId, testUserEmail },
          analysis,
          summary: {
            fileAccessible: analysis.fileExists,
            totalNotifications: analysis.totalNotifications,
            validNotifications: analysis.structureAnalysis.validStructure,
            userMatches: analysis.userAnalysis.exactIdMatches + analysis.userAnalysis.exactEmailMatches,
            hasRecommendations: analysis.recommendations.length > 0
          },
          timestamp: new Date().toISOString()
        });

      case 'suggestions':
        const suggestions = await NotificationsContentAnalyzer.suggestCorrections(testUserId, testUserEmail);
        
        return NextResponse.json({
          action: 'suggestions',
          testParams: { testUserId, testUserEmail },
          suggestions,
          timestamp: new Date().toISOString()
        });

      case 'generate-test':
        const testNotification = NotificationsContentAnalyzer.generateTestNotification(
          testUserId, 
          testUserEmail, 
          user.name || 'Test User'
        );
        
        return NextResponse.json({
          action: 'generate-test',
          testParams: { testUserId, testUserEmail },
          testNotification,
          instructions: [
            '1. Copiez cette notification dans votre fichier JSON',
            '2. Ajoutez-la au début du tableau de notifications',
            '3. Sauvegardez le fichier',
            '4. Testez à nouveau l\'API notifications'
          ],
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({ 
          error: 'Action non supportée',
          availableActions: ['analyze', 'suggestions', 'generate-test']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('🔍 [ANALYZE] Erreur:', error);
    return NextResponse.json({
      error: 'Erreur lors de l\'analyse',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = session.user as any;
    const body = await request.json();
    const { action, userId, userEmail } = body;

    if (action === 'create-test-notification') {
      const testNotification = NotificationsContentAnalyzer.generateTestNotification(
        userId || user.id,
        userEmail || user.email,
        user.name || 'Test User'
      );

      // Note: Dans un vrai système, on ajouterait cette notification au fichier
      // Pour l'instant, on retourne juste la notification générée
      
      return NextResponse.json({
        success: true,
        testNotification,
        message: 'Notification de test générée. Ajoutez-la manuellement au fichier JSON.',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ 
      error: 'Action POST non supportée',
      availableActions: ['create-test-notification']
    }, { status: 400 });

  } catch (error) {
    console.error('🔍 [ANALYZE] Erreur POST:', error);
    return NextResponse.json({
      error: 'Erreur lors de la création',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}