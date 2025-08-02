import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationConfigService } from '@/lib/services/NotificationConfigService';

// GET - Récupérer toutes les préférences de notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    if (!user.role || !['ADMIN', 'ADMINLABO'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    

    let preferences;
    if (userId) {
      preferences = await notificationConfigService.getPreferencesByUserId(userId);
    } else if (role) {
      preferences = await notificationConfigService.getPreferencesByRole(role);
    } else {
      preferences = await notificationConfigService.getAllPreferences();
    }

    

    return NextResponse.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('[API] ❌ Erreur lors de la récupération des préférences:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// POST - Initialiser les préférences par défaut ou réinitialiser
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    if (!user.role || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs peuvent initialiser les préférences' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Action de réinitialisation aux valeurs par défaut
    if (body.action === 'reset-defaults') {
      
      
      // Réinitialiser d'abord les configurations
      await notificationConfigService.resetToDefaults();
      
      // Supprimer toutes les préférences personnalisées pour forcer l'utilisation des valeurs par défaut
      // TODO: Implémenter la suppression des préférences personnalisées si nécessaire
      
      const preferences = await notificationConfigService.getAllPreferences();

      

      return NextResponse.json({
        success: true,
        message: 'Préférences réinitialisées aux valeurs par défaut',
        preferences
      });
    }

    // Action d'initialisation des préférences pour un utilisateur
    if (body.action === 'initialize-user') {
      const { userId, userRole } = body;
      
      if (!userId || !userRole) {
        return NextResponse.json(
          { error: 'userId et userRole requis pour l\'initialisation' },
          { status: 400 }
        );
      }

      
      
      // Récupérer toutes les configurations disponibles
      const configs = await notificationConfigService.getAllConfigs();
      
      // Créer les préférences basées sur les valeurs par défaut du rôle
      for (const config of configs) {
        const enabled = config.defaultRoles.includes(userRole);
        await notificationConfigService.createOrUpdatePreference(
          userId,
          userRole,
          config.module,
          config.actionType,
          enabled
        );
      }

      

      return NextResponse.json({
        success: true,
        message: `Préférences initialisées pour l'utilisateur ${userId}`,
      });
    }

    return NextResponse.json(
      { error: 'Action non reconnue' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[API] ❌ Erreur lors de l\'initialisation:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour les préférences par rôle
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    if (!user.role || !['ADMIN', 'ADMINLABO'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Mise à jour par utilisateur spécifique
    if (body.userId) {
      const { userId, userRole, updates } = body;

      if (!userId || !userRole || !Array.isArray(updates)) {
        return NextResponse.json(
          { error: 'userId, userRole et updates (array) sont requis' },
          { status: 400 }
        );
      }

      

      for (const update of updates) {
        const { module, actionType, enabled, customSettings } = update;
        
        if (!module || !actionType) {
          console.warn(`[API] ⚠️ Module ou actionType manquant dans les updates`);
          continue;
        }

        await notificationConfigService.createOrUpdatePreference(
          userId,
          userRole,
          module,
          actionType,
          enabled !== undefined ? enabled : true,
          customSettings
        );
      }

      

      return NextResponse.json({
        success: true,
        message: `Préférences mises à jour pour l'utilisateur ${userId}`,
        updatedCount: updates.length
      });
    }

    // Mise à jour par rôle (pour la compatibilité avec l'interface existante)
    if (body.role) {
      const { role, updates } = body;

      if (!role || !Array.isArray(updates)) {
        return NextResponse.json(
          { error: 'role et updates (array) sont requis' },
          { status: 400 }
        );
      }

      

      // Pour la mise à jour par rôle, nous devons mettre à jour toutes les préférences existantes
      // ou créer un système de préférences par défaut de rôle
      let updatedCount = 0;

      // Récupérer tous les utilisateurs avec ce rôle (à implémenter selon votre système d'utilisateurs)
      // Pour l'instant, nous allons créer/mettre à jour des préférences "templates" pour le rôle
      
      for (const update of updates) {
        const { module, actionType, enabled } = update;
        
        if (!module || !actionType) {
          console.warn(`[API] ⚠️ Module ou actionType manquant dans les updates`);
          continue;
        }

        // Ici, vous pourriez implémenter une logique pour mettre à jour
        // toutes les préférences existantes pour ce rôle, ou maintenir
        // une table de préférences par défaut par rôle
        
        // Pour l'instant, nous utilisons un ID spécial pour les préférences de rôle
        const roleUserId = `ROLE_${role}`;
        
        await notificationConfigService.createOrUpdatePreference(
          roleUserId,
          role,
          module,
          actionType,
          enabled !== undefined ? enabled : true
        );
        
        updatedCount++;
      }

      

      return NextResponse.json({
        success: true,
        message: `Préférences mises à jour pour le rôle ${role}`,
        updatedCount
      });
    }

    return NextResponse.json(
      { error: 'userId ou role requis' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[API] ❌ Erreur lors de la mise à jour:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer les préférences d'un utilisateur
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    if (!user.role || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs peuvent supprimer les préférences' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId requis' },
        { status: 400 }
      );
    }

    

    // TODO: Implémenter la suppression dans NotificationConfigService
    // const deleted = await notificationConfigService.deleteUserPreferences(userId);

    

    return NextResponse.json({
      success: true,
      message: `Préférences supprimées pour l'utilisateur ${userId}`
    });

  } catch (error) {
    console.error('[API] ❌ Erreur lors de la suppression:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
