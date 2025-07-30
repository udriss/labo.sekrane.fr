import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationConfigService, NotificationConfig } from '@/lib/services/NotificationConfigService';

// GET - Récupérer toutes les configurations de notifications
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

    console.log('[API] 📋 Récupération des configurations de notifications...');

    const configs = await notificationConfigService.getAllConfigs();
    const stats = await notificationConfigService.getStats();

    console.log(`[API] ✅ ${configs.length} configurations récupérées`);

    return NextResponse.json({
      success: true,
      configs,
      stats
    });

  } catch (error) {
    console.error('[API] ❌ Erreur lors de la récupération des configurations:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle configuration ou réinitialiser aux valeurs par défaut
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
        { error: 'Seuls les administrateurs peuvent modifier les configurations' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Action de réinitialisation
    if (body.action === 'reset-defaults') {
      console.log('[API] 🔄 Réinitialisation aux valeurs par défaut...');
      
      await notificationConfigService.resetToDefaults();
      
      const configs = await notificationConfigService.getAllConfigs();
      const stats = await notificationConfigService.getStats();

      console.log('[API] ✅ Réinitialisation terminée');

      return NextResponse.json({
        success: true,
        message: 'Configurations réinitialisées aux valeurs par défaut',
        configs,
        stats
      });
    }

    // Action d'initialisation
    if (body.action === 'initialize') {
      console.log('[API] 🚀 Initialisation des configurations par défaut...');
      
      await notificationConfigService.initializeDefaultConfigs();
      
      const configs = await notificationConfigService.getAllConfigs();
      const stats = await notificationConfigService.getStats();

      console.log('[API] ✅ Initialisation terminée');

      return NextResponse.json({
        success: true,
        message: 'Configurations initialisées',
        configs,
        stats
      });
    }

    // Création d'une nouvelle configuration
    const { id, module, actionType, name, description, severity, enabled, defaultRoles, metadata } = body;

    if (!id || !module || !actionType || !name) {
      return NextResponse.json(
        { error: 'Paramètres manquants (id, module, actionType, name requis)' },
        { status: 400 }
      );
    }

    console.log(`[API] ➕ Création de la configuration: ${id}`);

    const newConfig = await notificationConfigService.createConfig({
      id,
      module,
      actionType,
      name,
      description: description || '',
      severity: severity || 'medium',
      enabled: enabled !== undefined ? enabled : true,
      defaultRoles: defaultRoles || [],
      metadata
    });

    console.log(`[API] ✅ Configuration créée: ${newConfig.id}`);

    return NextResponse.json({
      success: true,
      config: newConfig,
      message: 'Configuration créée avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('[API] ❌ Erreur lors de la création/initialisation:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour une configuration existante
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
    if (!user.role || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs peuvent modifier les configurations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de configuration requis' },
        { status: 400 }
      );
    }

    console.log(`[API] ✏️ Mise à jour de la configuration: ${id}`);

    const updatedConfig = await notificationConfigService.updateConfig(id, updates);

    if (!updatedConfig) {
      return NextResponse.json(
        { error: 'Configuration non trouvée' },
        { status: 404 }
      );
    }

    console.log(`[API] ✅ Configuration mise à jour: ${updatedConfig.id}`);

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      message: 'Configuration mise à jour avec succès'
    });

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

// DELETE - Supprimer une configuration
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
        { error: 'Seuls les administrateurs peuvent supprimer les configurations' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de configuration requis' },
        { status: 400 }
      );
    }

    console.log(`[API] 🗑️ Suppression de la configuration: ${id}`);

    const deleted = await notificationConfigService.deleteConfig(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Configuration non trouvée' },
        { status: 404 }
      );
    }

    console.log(`[API] ✅ Configuration supprimée: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Configuration supprimée avec succès'
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
