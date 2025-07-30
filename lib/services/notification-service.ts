// lib/services/notification-service.ts

/**
 * Service pour créer et envoyer des notifications via l'API
 */

interface CreateNotificationParams {
  targetRoles?: string[];
  module: string;
  actionType: string;
  message: { fr: string; en: string };
  details?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  entityType?: string;
  entityId?: string;
  specificUsers?: string[];
}

export class NotificationService {
  /**
   * Créer et envoyer une notification
   */
  static async createNotification(params: CreateNotificationParams): Promise<boolean> {
    try {
      console.log('🔔 [NotificationService] Création de notification:', params.module, params.actionType);

      // Utiliser l'endpoint /ws qui a le système de push intégré
      const response = await fetch('/api/notifications/ws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create-and-notify',
          ...params
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ [NotificationService] Erreur API:', response.status, errorData);
        return false;
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ [NotificationService] Notification créée et diffusée:', data.notificationId, `vers ${data.sentToConnections} connexions`);
        return true;
      } else {
        console.error('❌ [NotificationService] Création échouée:', data.error);
        return false;
      }

    } catch (error) {
      console.error('❌ [NotificationService] Erreur lors de la création:', error);
      return false;
    }
  }

  /**
   * Créer une notification de test
   */
  static async createTestNotification(userId?: string): Promise<boolean> {
    return this.createNotification({
      module: 'system',
      actionType: 'test',
      message: {
        fr: 'Notification de test - système de notifications temps réel actif',
        en: 'Test notification - real-time notification system active'
      },
      details: 'Ceci est une notification de test pour vérifier le bon fonctionnement du système SSE.',
      severity: 'medium',
      specificUsers: userId ? [userId] : undefined,
      targetRoles: userId ? undefined : ['ADMIN', 'USER']
    });
  }

  /**
   * Notifications pour les équipements
   */
  static async notifyEquipmentAction(
    action: 'created' | 'updated' | 'deleted' | 'borrowed' | 'returned',
    equipmentName: string,
    userId?: string
  ): Promise<boolean> {
    const messages = {
      created: {
        fr: `Nouvel équipement ajouté: ${equipmentName}`,
        en: `New equipment added: ${equipmentName}`
      },
      updated: {
        fr: `Équipement modifié: ${equipmentName}`,
        en: `Equipment updated: ${equipmentName}`
      },
      deleted: {
        fr: `Équipement supprimé: ${equipmentName}`,
        en: `Equipment deleted: ${equipmentName}`
      },
      borrowed: {
        fr: `Équipement emprunté: ${equipmentName}`,
        en: `Equipment borrowed: ${equipmentName}`
      },
      returned: {
        fr: `Équipement retourné: ${equipmentName}`,
        en: `Equipment returned: ${equipmentName}`
      }
    };

    return this.createNotification({
      module: 'equipment',
      actionType: action,
      message: messages[action],
      details: `Action effectuée sur l'équipement: ${equipmentName}`,
      severity: action === 'deleted' ? 'high' : 'medium',
      specificUsers: userId ? [userId] : undefined,
      targetRoles: userId ? undefined : ['ADMIN', 'USER']
    });
  }

  /**
   * Notifications pour les réservations
   */
  static async notifyCalendarAction(
    action: 'created' | 'updated' | 'deleted',
    eventTitle: string,
    userId?: string
  ): Promise<boolean> {
    const messages = {
      created: {
        fr: `Nouvelle réservation: ${eventTitle}`,
        en: `New reservation: ${eventTitle}`
      },
      updated: {
        fr: `Réservation modifiée: ${eventTitle}`,
        en: `Reservation updated: ${eventTitle}`
      },
      deleted: {
        fr: `Réservation annulée: ${eventTitle}`,
        en: `Reservation cancelled: ${eventTitle}`
      }
    };

    return this.createNotification({
      module: 'calendar',
      actionType: action,
      message: messages[action],
      details: `Action effectuée sur la réservation: ${eventTitle}`,
      severity: action === 'deleted' ? 'high' : 'medium',
      specificUsers: userId ? [userId] : undefined,
      targetRoles: userId ? undefined : ['ADMIN', 'USER']
    });
  }

  /**
   * Notifications pour les produits chimiques
   */
  static async notifyChemicalAction(
    action: 'low_stock' | 'expired' | 'added' | 'used',
    chemicalName: string,
    userId?: string
  ): Promise<boolean> {
    const messages = {
      low_stock: {
        fr: `Stock faible: ${chemicalName}`,
        en: `Low stock: ${chemicalName}`
      },
      expired: {
        fr: `Produit expiré: ${chemicalName}`,
        en: `Expired product: ${chemicalName}`
      },
      added: {
        fr: `Nouveau produit chimique: ${chemicalName}`,
        en: `New chemical product: ${chemicalName}`
      },
      used: {
        fr: `Produit utilisé: ${chemicalName}`,
        en: `Product used: ${chemicalName}`
      }
    };

    const severities = {
      low_stock: 'high' as const,
      expired: 'critical' as const,
      added: 'medium' as const,
      used: 'low' as const
    };

    return this.createNotification({
      module: 'chemicals',
      actionType: action,
      message: messages[action],
      details: `Action effectuée sur le produit chimique: ${chemicalName}`,
      severity: severities[action],
      specificUsers: userId ? [userId] : undefined,
      targetRoles: userId ? undefined : ['ADMIN', 'USER']
    });
  }
}
