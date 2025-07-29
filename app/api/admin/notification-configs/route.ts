import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface NotificationConfig {
  id: string;
  module: string;
  actionType: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Configurations prédéfinies des types de notifications par module
const DEFAULT_CONFIGS: NotificationConfig[] = [
  // Module USERS
  {
    id: 'users_new_registration',
    module: 'USERS',
    actionType: 'NEW_USER_REGISTRATION',
    name: 'Nouvelle inscription utilisateur',
    description: 'Notification envoyée lors de l\'inscription d\'un nouvel utilisateur nécessitant une validation',
    severity: 'medium',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'users_account_activated',
    module: 'USERS',
    actionType: 'ACCOUNT_ACTIVATED',
    name: 'Compte utilisateur activé',
    description: 'Notification envoyée lorsqu\'un compte utilisateur est activé par un administrateur',
    severity: 'low',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'users_role_changed',
    module: 'USERS',
    actionType: 'ROLE_CHANGED',
    name: 'Rôle utilisateur modifié',
    description: 'Notification envoyée lorsque le rôle d\'un utilisateur est modifié',
    severity: 'medium',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },

  // Module CHEMICALS
  {
    id: 'chemicals_stock_low',
    module: 'CHEMICALS',
    actionType: 'STOCK_LOW',
    name: 'Stock faible de produit chimique',
    description: 'Notification envoyée lorsque le stock d\'un produit chimique est en dessous du seuil minimum',
    severity: 'high',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'chemicals_expiry_warning',
    module: 'CHEMICALS',
    actionType: 'EXPIRY_WARNING',
    name: 'Produit chimique bientôt périmé',
    description: 'Notification envoyée lorsqu\'un produit chimique approche de sa date d\'expiration',
    severity: 'medium',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'chemicals_new_arrival',
    module: 'CHEMICALS',
    actionType: 'NEW_ARRIVAL',
    name: 'Nouveau produit chimique ajouté',
    description: 'Notification envoyée lorsqu\'un nouveau produit chimique est ajouté à l\'inventaire',
    severity: 'low',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },

  // Module EQUIPMENT
  {
    id: 'equipment_maintenance_due',
    module: 'EQUIPMENT',
    actionType: 'MAINTENANCE_DUE',
    name: 'Maintenance d\'équipement requise',
    description: 'Notification envoyée lorsqu\'un équipement nécessite une maintenance préventive',
    severity: 'high',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'equipment_malfunction',
    module: 'EQUIPMENT',
    actionType: 'MALFUNCTION',
    name: 'Dysfonctionnement d\'équipement',
    description: 'Notification envoyée lorsqu\'un équipement présente un dysfonctionnement',
    severity: 'critical',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'equipment_calibration_due',
    module: 'EQUIPMENT',
    actionType: 'CALIBRATION_DUE',
    name: 'Calibration d\'équipement requise',
    description: 'Notification envoyée lorsqu\'un équipement nécessite une calibration',
    severity: 'medium',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },

  // Module ROOMS
  {
    id: 'rooms_reserved',
    module: 'ROOMS',
    actionType: 'ROOM_RESERVED',
    name: 'Salle réservée',
    description: 'Notification envoyée lorsqu\'une salle est réservée',
    severity: 'low',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'rooms_conflict',
    module: 'ROOMS',
    actionType: 'BOOKING_CONFLICT',
    name: 'Conflit de réservation',
    description: 'Notification envoyée en cas de conflit de réservation de salle',
    severity: 'high',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'rooms_maintenance',
    module: 'ROOMS',
    actionType: 'MAINTENANCE_SCHEDULED',
    name: 'Maintenance de salle programmée',
    description: 'Notification envoyée lorsqu\'une maintenance de salle est programmée',
    severity: 'medium',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },

  // Module CALENDAR
  {
    id: 'calendar_event_created',
    module: 'CALENDAR',
    actionType: 'EVENT_CREATED',
    name: 'Événement créé',
    description: 'Notification envoyée lorsqu\'un nouvel événement est créé dans le calendrier',
    severity: 'low',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'calendar_event_modified',
    module: 'CALENDAR',
    actionType: 'EVENT_MODIFIED',
    name: 'Événement modifié',
    description: 'Notification envoyée lorsqu\'un événement existant est modifié',
    severity: 'medium',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'calendar_event_reminder',
    module: 'CALENDAR',
    actionType: 'EVENT_REMINDER',
    name: 'Rappel d\'événement',
    description: 'Notification de rappel envoyée avant un événement',
    severity: 'low',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },

  // Module ORDERS
  {
    id: 'orders_delivered',
    module: 'ORDERS',
    actionType: 'ORDER_DELIVERED',
    name: 'Commande livrée',
    description: 'Notification envoyée lorsqu\'une commande est livrée',
    severity: 'medium',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'orders_delayed',
    module: 'ORDERS',
    actionType: 'ORDER_DELAYED',
    name: 'Commande retardée',
    description: 'Notification envoyée lorsqu\'une commande est retardée',
    severity: 'high',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'orders_approved',
    module: 'ORDERS',
    actionType: 'ORDER_APPROVED',
    name: 'Commande approuvée',
    description: 'Notification envoyée lorsqu\'une commande est approuvée',
    severity: 'low',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },

  // Module SECURITY
  {
    id: 'security_alert',
    module: 'SECURITY',
    actionType: 'SECURITY_ALERT',
    name: 'Alerte de sécurité',
    description: 'Notification envoyée en cas d\'incident de sécurité',
    severity: 'critical',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'security_access_denied',
    module: 'SECURITY',
    actionType: 'ACCESS_DENIED',
    name: 'Accès refusé',
    description: 'Notification envoyée lors d\'une tentative d\'accès non autorisé',
    severity: 'high',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'security_login_suspicious',
    module: 'SECURITY',
    actionType: 'SUSPICIOUS_LOGIN',
    name: 'Connexion suspecte',
    description: 'Notification envoyée lors d\'une connexion depuis un lieu inhabituel',
    severity: 'medium',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },

  // Module SYSTEM
  {
    id: 'system_maintenance',
    module: 'SYSTEM',
    actionType: 'MAINTENANCE',
    name: 'Maintenance système',
    description: 'Notification envoyée lors d\'une maintenance système programmée',
    severity: 'high',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'system_backup_completed',
    module: 'SYSTEM',
    actionType: 'BACKUP_COMPLETED',
    name: 'Sauvegarde terminée',
    description: 'Notification envoyée lorsqu\'une sauvegarde système est terminée',
    severity: 'low',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'system_update_available',
    module: 'SYSTEM',
    actionType: 'UPDATE_AVAILABLE',
    name: 'Mise à jour disponible',
    description: 'Notification envoyée lorsqu\'une mise à jour système est disponible',
    severity: 'medium',
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
];

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

    console.log('🔧 [ADMIN] Récupération des configurations de notifications');

    // Pour l'instant, on retourne les configurations par défaut
    // Dans un vrai système, celles-ci pourraient être stockées en base de données
    const configs = DEFAULT_CONFIGS;

    // Organiser par module
    const configsByModule: Record<string, NotificationConfig[]> = {};
    configs.forEach(config => {
      if (!configsByModule[config.module]) {
        configsByModule[config.module] = [];
      }
      configsByModule[config.module].push(config);
    });

    // Calculer les statistiques
    const stats = {
      total: configs.length,
      byModule: Object.keys(configsByModule).reduce((acc, module) => {
        acc[module] = {
          total: configsByModule[module].length,
          enabled: configsByModule[module].filter(c => c.enabled).length
        };
        return acc;
      }, {} as Record<string, { total: number; enabled: number }>),
      bySeverity: configs.reduce((acc, config) => {
        acc[config.severity] = (acc[config.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return NextResponse.json({
      success: true,
      configs,
      configsByModule,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🔧 [ADMIN] Erreur lors de la récupération des configurations:', error);
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
    if (!user.role || !['ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const body = await request.json();
    const { configId, updates } = body;

    if (!configId || !updates) {
      return NextResponse.json({
        error: 'Paramètres invalides. Requis: configId, updates'
      }, { status: 400 });
    }

    console.log('🔧 [ADMIN] Mise à jour de la configuration:', configId);

    // Pour l'instant, on simule la mise à jour
    // Dans un vrai système, on mettrait à jour la base de données
    
    return NextResponse.json({
      success: true,
      message: `Configuration ${configId} mise à jour`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🔧 [ADMIN] Erreur lors de la mise à jour de la configuration:', error);
    return NextResponse.json({
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}