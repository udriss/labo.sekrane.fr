// lib/utils/notification-display.ts

/**
 * Interface pour les messages de notification améliorés
 */
export interface EnhancedNotificationMessage {
  messageToDisplay: string;
  log_message: string;
}

/**
 * Interface pour le résultat d'affichage d'une notification
 */
export interface NotificationDisplayResult {
  text: string;
  type: 'enhanced' | 'legacy' | 'i18n' | 'unknown' | 'error';
  logMessage?: string;
}

/**
 * Fonction utilitaire pour extraire le message d'affichage d'une notification
 * 
 * @param message - Le message de la notification (JSON string ou objet)
 * @returns Objet contenant le texte à afficher et le type de message
 */
export function getNotificationDisplayMessage(message: any): NotificationDisplayResult {
  try {
    // Si le message est déjà un objet, l'utiliser directement
    // Sinon, essayer de le parser comme JSON
    const messageObj = typeof message === 'string' ? JSON.parse(message) : message;
    
    // Nouveau format amélioré avec messageToDisplay et log_message
    if (typeof messageObj === 'object' && messageObj !== null && messageObj.messageToDisplay) {
      return {
        text: messageObj.messageToDisplay,
        type: 'enhanced',
        logMessage: messageObj.log_message
      };
    }
    
    // Format internationalisé (fr/en)
    else if (typeof messageObj === 'object' && messageObj !== null && messageObj.fr) {
      return {
        text: messageObj.fr, // Privilégier le français
        type: 'i18n'
      };
    }
    
    // Format internationalisé anglais uniquement
    else if (typeof messageObj === 'object' && messageObj !== null && messageObj.en) {
      return {
        text: messageObj.en,
        type: 'i18n'
      };
    }
    
    // Ancien format simple (string)
    else if (typeof messageObj === 'string') {
      return {
        text: messageObj,
        type: 'legacy'
      };
    }
    
    // Format objet non reconnu
    else {
      return {
        text: JSON.stringify(messageObj),
        type: 'unknown'
      };
    }
    
  } catch (error) {
    // Erreur de parsing JSON
    return {
      text: 'Message indisponible',
      type: 'error'
    };
  }
}

/**
 * Fonction pour formater un message de notification pour l'affichage dans l'interface
 * 
 * @param notification - Objet notification complet
 * @returns Texte formaté pour l'affichage
 */
export function formatNotificationForUI(notification: any): string {
  const display = getNotificationDisplayMessage(notification.message);
  
  // Pour le format amélioré, retourner directement le message
  if (display.type === 'enhanced') {
    return display.text;
  }
  
  // Pour les autres formats, on peut ajouter du contexte si nécessaire
  return display.text;
}

/**
 * Fonction pour obtenir l'icône appropriée selon le type de notification
 */
export function getNotificationIcon(module: string, actionType: string): string {
  const iconMap: Record<string, Record<string, string>> = {
    CHEMICALS: {
      CREATE: '🧪',
      UPDATE: '🔄',
      DELETE: '🗑️',
      READ: '👁️'
    },
    EQUIPMENT: {
      CREATE: '🔧',
      UPDATE: '⚙️',
      DELETE: '🗑️',
      READ: '👁️'
    },
    USERS: {
      CREATE: '👤',
      UPDATE: '✏️',
      DELETE: '❌',
      READ: '👀'
    },
    CALENDAR: {
      CREATE: '📅',
      UPDATE: '📝',
      DELETE: '🗑️',
      APPROVE: '✅',
      REJECT: '❌'
    }
  };
  
  return iconMap[module]?.[actionType] || '📢';
}

/**
 * Fonction pour obtenir la couleur de sévérité
 */
export function getSeverityColor(severity: string): string {
  const colorMap: Record<string, string> = {
    low: 'text-blue-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600'
  };
  
  return colorMap[severity] || 'text-gray-600';
}

/**
 * Fonction pour obtenir le badge de sévérité
 */
export function getSeverityBadge(severity: string): string {
  const badgeMap: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };
  
  return badgeMap[severity] || 'bg-gray-100 text-gray-800';
}
