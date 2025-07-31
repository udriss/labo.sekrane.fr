// lib/services/notification-service.js

/**
 * Service pour créer et envoyer des notifications via l'API
 */

/**
 * Créer et envoyer une notification
 * @param {object} params - Paramètres de la notification
 * @returns {Promise<{success: boolean, notification?: object, error?: string}>}
 */
export async function createNotification(params) {
  try {
    console.log('🔔 [NotificationService] Création de notification:', params.module);

    // Préparer les données pour l'API
    const apiData = {
      targetRoles: params.targetRoles || ['ADMIN', 'ADMINLABO', 'TEACHER', 'LABORANTIN'],
      userId: params.userId,
      module: params.module || 'system',
      actionType: params.type || 'NOTIFICATION',
      message: {
        fr: params.message || params.title || 'Notification système',
        en: params.message || params.title || 'System notification'
      },
      details: params.details || '',
      severity: (params.severity || 'medium').toLowerCase(),
      entityType: params.entityType,
      entityId: params.entityId,
      triggeredBy: params.triggeredBy
    };

    // Utiliser l'endpoint /api/notifications qui gère la création en BDD
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ [NotificationService] Erreur API:', response.status, errorData);
      return { success: false, error: errorData };
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ [NotificationService] Notification créée et diffusée:', data.notification?.id);
      return { 
        success: true, 
        notification: {
          id: data.notification?.id,
          title: params.title,
          message: params.message
        }
      };
    } else {
      console.error('❌ [NotificationService] Création échouée:', data.error);
      return { success: false, error: data.error };
    }

  } catch (error) {
    console.error('❌ [NotificationService] Erreur lors de la création:', error);
    return { success: false, error: error.message };
  }
}
