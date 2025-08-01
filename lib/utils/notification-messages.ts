// lib/utils/notification-messages.ts

import React from 'react';

export interface EnhancedNotificationMessage {
  messageToDisplay: string;
  log_message: string;
}

export interface NotificationDisplayData {
  displayMessage: string | React.ReactElement;
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
 * Parse le message de notification et retourne les données d'affichage avec mise en forme avancée
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

    // Si c'est une chaîne, on applique le parsing avancé avec mise en forme
    if (typeof message === 'string') {
      try {
        const parsed = JSON.parse(message);
        if (parsed.messageToDisplay) {
          return parseAndStyleMessage(parsed.messageToDisplay, parsed);
        }
        return parseAndStyleMessage(String(parsed), parsed);
      } catch {
        // Chaîne simple - appliquer le parsing avec style
        return parseAndStyleMessage(message, {});
      }
    }

    // Format d'ancienne notification multilingue
    if (typeof message === 'object' && message !== null) {
      let messageText = '';
      if (typeof message.fr === 'string') messageText = message.fr;
      else if (typeof message.en === 'string') messageText = message.en;
      else if (typeof message.text === 'string') messageText = message.text;
      else {
        const firstValue = Object.values(message).find(v => typeof v === 'string');
        messageText = firstValue || '';
      }
      
      if (messageText) {
        return parseAndStyleMessage(messageText, message);
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
 * Parse et stylise un message de notification
 */
function parseAndStyleMessage(message: string, originalData: any): NotificationDisplayData {
  // Expression régulière pour capturer les éléments principaux du message
  const patterns = {
    // Capture: [Utilisateur] a [action] [item] : [détails]
    general: /^(.+?)\s+a\s+(ajouté|modifié|supprimé|déplacé|changé)\s+(.+?)(?:\s*:\s*(.+))?$/i,
    // Capture pour les changements spécifiques (quantité, localisation, etc.)
    change: /^(.+?)\s+a\s+(modifié|changé|déplacé)\s+(.+?)\s+(?:de\s+)?(.+?)\s*:\s*(.+)\s*→\s*(.+)$/i,
    // Capture pour les ajouts
    addition: /^(.+?)\s+a\s+ajouté\s+(.+?)\s*\((.+?)\)\s+à\s+l'inventaire$/i,
  };

  // Fonction pour créer du texte stylisé
  const createStyledText = (text: string, type: 'user' | 'item' | 'action' | 'quantity' | 'old' | 'new' | 'details') => {
    const styles: Record<string, React.CSSProperties> = {
      user: { fontWeight: 'bold', color: '#1976d2' },
      item: { fontWeight: 'bold', color: '#2e7d32' },
      action: { fontStyle: 'italic', color: '#f57c00' },
      quantity: { fontWeight: 'bold', color: '#1976d2', backgroundColor: '#e3f2fd', padding: '2px 4px', borderRadius: '4px' },
      old: { textDecoration: 'line-through', color: '#d32f2f', backgroundColor: '#ffebee', padding: '2px 4px', borderRadius: '4px' },
      new: { fontWeight: 'bold', color: '#2e7d32', backgroundColor: '#e8f5e8', padding: '2px 4px', borderRadius: '4px' },
      details: { color: '#666', fontStyle: 'italic' }
    };
    
    return React.createElement('span', { 
      style: styles[type],
      key: `${type}-${Math.random()}`
    }, text);
  };

  // Essayer de matcher le pattern de changement
  let changeMatch: RegExpMatchArray | null = null;
  if (typeof message === 'string') {
    changeMatch = message.match(patterns.change);
  }
  if (changeMatch !== null) {
    const [, userName, action, property, item, oldValue, newValue] = changeMatch;
    return {
      displayMessage: React.createElement('span', {},
        createStyledText(userName, 'user'), ' a ',
        createStyledText(action, 'action'), ' ', property, ' de ',
        createStyledText(item, 'item'), ' : ',
        createStyledText(oldValue, 'old'), ' → ',
        createStyledText(newValue, 'new')
      ),
      logMessage: message,
      details: {
        userName,
        itemName: item,
        action,
        oldValue,
        newValue,
        ...extractDetailsFromMessage(originalData)
      }
    };
  }

  // Essayer de matcher le pattern d'ajout
  let additionMatch: RegExpMatchArray | null = null;
  if (typeof message === 'string') {
    additionMatch = message.match(patterns.addition);
  }
  if (additionMatch !== null) {
    const [, userName, itemName, quantity] = additionMatch;
    return {
      displayMessage: React.createElement('span', {},
        createStyledText(userName, 'user'), ' a ajouté ',
        createStyledText(itemName, 'item'),
        createStyledText(` (${quantity})`, 'quantity'), ' à l\'inventaire'
      ),
      logMessage: message,
      details: {
        userName,
        itemName,
        action: 'ajouté',
        ...extractDetailsFromMessage(originalData)
      }
    };
  }

  // Pattern général
  let generalMatch: RegExpMatchArray | null = null;
  if (typeof message === 'string') {
    generalMatch = message.match(patterns.general);
  }
  if (generalMatch !== null) {
    const [, userName, action, item, details] = generalMatch;
    return {
      displayMessage: React.createElement('span', {},
        createStyledText(userName, 'user'), ' a ',
        createStyledText(action, 'action'), ' ',
        createStyledText(item, 'item'),
        details ? React.createElement('span', {}, ' : ', createStyledText(details, 'details')) : null
      ),
      logMessage: message,
      details: {
        userName,
        itemName: item,
        action,
        ...extractDetailsFromMessage(originalData)
      }
    };
  }

  // Si aucun pattern ne correspond, retourner le message original avec le premier mot en gras
  if (typeof message === 'string') {
    const parts = message.split(' ');
    const firstWord = parts[0];
    const restOfMessage = parts.slice(1).join(' ');
    return {
      displayMessage: React.createElement('span', {},
        createStyledText(firstWord, 'user'), ' ', restOfMessage
      ),
      logMessage: message,
      details: {
        userName: firstWord,
        action: 'action',
        ...extractDetailsFromMessage(originalData)
      }
    };
  } else {
    // Si ce n'est pas une chaîne, afficher le message brut
    return {
      displayMessage: String(message),
      logMessage: String(message),
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
  
  // Si displayMessage est un React element, on utilise le logMessage
  const baseMessage = typeof displayData.displayMessage === 'string' 
    ? displayData.displayMessage 
    : displayData.logMessage;
  
  if (!details) return baseMessage;

  let description = baseMessage;

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
 * Obtient l'icône Material-UI appropriée selon le module et l'action
 */
export function getNotificationIcon(module: string, actionType: string): string {
  // Icônes Material-UI par module
  const moduleIcons = {
    CHEMICALS: 'Science', // Science icon
    EQUIPMENT: 'Biotech', // Biotech icon
    USERS: 'Person', // Person icon
    CALENDAR: 'Event', // Event icon
    ORDERS: 'ShoppingCart', // ShoppingCart icon
    SECURITY: 'Security', // Security icon
    SYSTEM: 'Settings', // Settings icon
    ROOMS: 'Business', // Business icon
    NOTEBOOK: 'MenuBook', // MenuBook icon
    AUDIT: 'Assignment' // Assignment icon
  };

  // Icônes Material-UI par action
  const actionIcons = {
    CREATE: 'Add', // Add icon
    UPDATE: 'Edit', // Edit icon
    DELETE: 'Delete', // Delete icon
    READ: 'Visibility', // Visibility icon
    POST: 'Send', // Send icon
    GET: 'GetApp' // GetApp icon
  };

  return moduleIcons[module as keyof typeof moduleIcons] || 
         actionIcons[actionType as keyof typeof actionIcons] || 
         'Notifications'; // Default Notifications icon
}

/**
 * Obtient la couleur d'affichage selon la sévérité avec plus d'options
 */
export function getSeverityColor(severity: string): {
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  bgcolor?: string;
} {
  switch (severity.toLowerCase()) {
    case 'critical':
      return { color: 'error', bgcolor: '#ffebee' };
    case 'high':
      return { color: 'error', bgcolor: '#fff3e0' };
    case 'medium':
      return { color: 'warning', bgcolor: '#fff8e1' };
    case 'low':
      return { color: 'info', bgcolor: '#e3f2fd' };
    case 'success':
      return { color: 'success', bgcolor: '#e8f5e8' };
    default:
      return { color: 'default', bgcolor: '#fafafa' };
  }
}

/**
 * Formate la date de façon relative avec plus de précision
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 30) return 'À l\'instant';
  if (diffSeconds < 60) return `Il y a ${diffSeconds}s`;
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
  }
  
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Obtient une icône Material-UI basée sur l'action utilisateur
 */
export function getActionIcon(action: string): string {
  const actionIconMap: Record<string, string> = {
    'ajouté': 'Add',
    'modifié': 'Edit',
    'supprimé': 'Delete',
    'déplacé': 'DriveFileMove',
    'changé': 'SwapHoriz',
    'créé': 'Add',
    'mis à jour': 'Update',
    'archivé': 'Archive',
    'restauré': 'Restore',
    'validé': 'CheckCircle',
    'rejeté': 'Cancel'
  };

  return actionIconMap[action.toLowerCase()] || 'Circle';
}

/**
 * Obtient une couleur basée sur l'action utilisateur
 */
export function getActionColor(action: string): string {
  const actionColorMap: Record<string, string> = {
    'ajouté': '#2e7d32',
    'créé': '#2e7d32',
    'modifié': '#f57c00',
    'changé': '#f57c00',
    'mis à jour': '#f57c00',
    'supprimé': '#d32f2f',
    'archivé': '#666',
    'déplacé': '#1976d2',
    'restauré': '#2e7d32',
    'validé': '#2e7d32',
    'rejeté': '#d32f2f'
  };

  return actionColorMap[action.toLowerCase()] || '#666';
}
