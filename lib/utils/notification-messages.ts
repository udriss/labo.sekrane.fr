// lib/utils/notification-messages.ts

export interface EnhancedNotificationMessage {
  messageToDisplay: string;
  log_message: string;
}

export interface NotificationDisplayData {
  displayMessage: string;
  logMessage: string;
  details?: {
    userName?: string;
    itemName?: string;
    module?: string;
    action?: string;
    oldValue?: any;
    newValue?: any;
    changes?: string[];
  };
}

/**
 * Parse le message de notification et retourne les données d'affichage
 */
export function parseNotificationMessage(message: any): NotificationDisplayData {
  try {
    // Si c'est déjà un objet avec messageToDisplay
    if (typeof message === 'object' && message !== null && message.messageToDisplay) {
      return {
        displayMessage: message.messageToDisplay,
        logMessage: message.log_message || 'Action effectuée',
        details: extractDetailsFromMessage(message)
      };
    }

    // Si c'est une chaîne JSON
    if (typeof message === 'string') {
      try {
        const parsed = JSON.parse(message);
        if (parsed.messageToDisplay) {
          return {
            displayMessage: parsed.messageToDisplay,
            logMessage: parsed.log_message || 'Action effectuée',
            details: extractDetailsFromMessage(parsed)
          };
        }
        // Message simple
        return {
          displayMessage: parsed,
          logMessage: parsed,
        };
      } catch {
        // Chaîne simple
        return {
          displayMessage: message,
          logMessage: message,
        };
      }
    }

    // Format d'ancienne notification multilingue
    if (typeof message === 'object' && message !== null) {
      if (message.fr) return { displayMessage: message.fr, logMessage: message.fr };
      if (message.en) return { displayMessage: message.en, logMessage: message.en };
      if (message.text) return { displayMessage: message.text, logMessage: message.text };
      
      // Prendre la première valeur
      const firstValue = Object.values(message)[0];
      if (typeof firstValue === 'string') {
        return { displayMessage: firstValue, logMessage: firstValue };
      }
    }

    return {
      displayMessage: 'Notification',
      logMessage: 'Action effectuée',
    };
  } catch (error) {
    console.error('Erreur lors du parsing du message de notification:', error);
    return {
      displayMessage: 'Message non disponible',
      logMessage: 'Erreur de parsing',
    };
  }
}

/**
 * Extrait les détails d'un message pour un affichage enrichi
 */
function extractDetailsFromMessage(message: any): NotificationDisplayData['details'] {
  if (!message || typeof message !== 'object') return undefined;

  return {
    userName: message.userName,
    itemName: message.itemName || message.chemicalName || message.equipmentName,
    module: message.module,
    action: message.action,
    oldValue: message.oldValue || message.before,
    newValue: message.newValue || message.after,
    changes: message.changes || message.fields
  };
}

/**
 * Génère une description détaillée pour l'affichage étendu
 */
export function getDetailedDescription(
  notification: any,
  displayData: NotificationDisplayData
): string {
  const { details } = displayData;
  
  if (!details) return displayData.displayMessage;

  let description = displayData.displayMessage;

  // Ajouter des détails spécifiques selon le module
  if (notification.module === 'CHEMICALS') {
    if (notification.actionType === 'UPDATE' && details.oldValue && details.newValue) {
      if (details.oldValue.quantity !== details.newValue.quantity) {
        const oldQty = details.oldValue.quantity;
        const newQty = details.newValue.quantity;
        const unit = details.newValue.unit || details.oldValue.unit || '';
        description += `\n📊 Quantité modifiée: ${oldQty}${unit} → ${newQty}${unit}`;
      }
      
      if (details.changes && details.changes.length > 0) {
        const fieldsChanged = details.changes.filter(field => 
          field !== 'quantity' && field !== 'updatedAt' && field !== 'id'
        );
        if (fieldsChanged.length > 0) {
          description += `\n🔧 Champs modifiés: ${fieldsChanged.join(', ')}`;
        }
      }
    }
  }

  if (notification.module === 'EQUIPMENT') {
    if (notification.actionType === 'UPDATE' && details.oldValue && details.newValue) {
      if (details.oldValue.quantity !== details.newValue.quantity) {
        const oldQty = details.oldValue.quantity;
        const newQty = details.newValue.quantity;
        description += `\n📊 Quantité modifiée: ${oldQty} → ${newQty} unité${newQty > 1 ? 's' : ''}`;
      }
    }
  }

  return description;
}

/**
 * Obtient l'icône appropriée selon le module et l'action
 */
export function getNotificationIcon(module: string, actionType: string): string {
  const moduleIcons = {
    CHEMICALS: '🧪',
    EQUIPMENT: '🔬',
    USERS: '👤',
    CALENDAR: '📅',
    ORDERS: '📦',
    SECURITY: '🔒',
    SYSTEM: '⚙️',
    ROOMS: '🏢'
  };

  const actionIcons = {
    CREATE: '➕',
    UPDATE: '✏️',
    DELETE: '🗑️',
    READ: '👀'
  };

  return moduleIcons[module as keyof typeof moduleIcons] || actionIcons[actionType as keyof typeof actionIcons] || '📢';
}

/**
 * Obtient la couleur d'affichage selon la sévérité
 */
export function getSeverityColor(severity: string): {
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  bgcolor?: string;
} {
  switch (severity) {
    case 'critical':
      return { color: 'error' };
    case 'high':
      return { color: 'warning' };
    case 'medium':
      return { color: 'info' };
    case 'low':
      return { color: 'success' };
    default:
      return { color: 'default' };
  }
}

/**
 * Formate la date de façon relative
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'À l\'instant';
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}
