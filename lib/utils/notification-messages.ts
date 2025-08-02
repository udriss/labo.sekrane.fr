// lib/utils/notification-messages.ts

import React from 'react';
import { 
  Science, 
  Biotech, 
  Person, 
  Event, 
  ShoppingCart, 
  Security, 
  Settings,
  Business,
  MenuBook,
  Assignment,
  Add,
  Edit,
  Delete,
  Visibility,
  Send,
  GetApp,
  Notifications,
  DriveFileMove,
  SwapHoriz,
  Update,
  Archive,
  Restore,
  CheckCircle,
  Cancel,
  Circle
} from '@mui/icons-material';

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
 * Parse et stylise un message de notification avec JSX
 */
function parseAndStyleMessage(message: string, originalData: any): NotificationDisplayData {
  // Expression régulière pour capturer les éléments principaux du message
  const patterns = {
    // Capture pour les changements de quantité: "Utilisateur a modifié la quantité de Item : old → new"
    quantityChange: /^(.+?)\s+a\s+(modifié|changé)\s+la\s+quantité\s+de\s+(.+?)\s*:\s*(.+?)\s*→\s*(.+?)$/i,
    // Capture générale: "Utilisateur a action Item : détails"
    general: /^(.+?)\s+a\s+(ajouté|modifié|supprimé|déplacé|changé|créé)\s+(.+?)(?:\s*:\s*(.+))?$/i,
    // Capture pour les ajouts: "Utilisateur a ajouté Item (quantity) à l'inventaire"
    addition: /^(.+?)\s+a\s+ajouté\s+(.+?)\s*\((.+?)\)\s+à\s+l'inventaire$/i,
  };

  // Vérifications de types et parsing
  let quantityMatch: RegExpMatchArray | null = null;
  let generalMatch: RegExpMatchArray | null = null;
  let additionMatch: RegExpMatchArray | null = null;

  if (typeof message === 'string') {
    quantityMatch = message.match(patterns.quantityChange);
    if (!quantityMatch) {
      generalMatch = message.match(patterns.general);
    }
    if (!quantityMatch && !generalMatch) {
      additionMatch = message.match(patterns.addition);
    }
  }

  // Pattern de changement de quantité
  if (quantityMatch !== null) {
    const [, userName, action, itemName, oldValue, newValue] = quantityMatch;
    return {
      displayMessage: React.createElement('span', { key: 'quantity-change' },
        React.createElement('strong', { 
          key: 'user',
          style: { color: '#1976d2', fontWeight: 'bold' } 
        }, userName),
        ' a ',
        React.createElement('em', { 
          key: 'action',
          style: { color: '#f57c00', fontStyle: 'italic' } 
        }, action),
        ' la quantité de ',
        React.createElement('strong', { 
          key: 'item',
          style: { color: '#2e7d32', fontWeight: 'bold' } 
        }, itemName),
        ' : ',
        React.createElement('span', { 
          key: 'old',
          style: { 
            textDecoration: 'line-through', 
            color: '#d32f2f', 
            backgroundColor: '#ffebee', 
            padding: '2px 4px', 
            borderRadius: '4px' 
          } 
        }, oldValue),
        ' → ',
        React.createElement('strong', { 
          key: 'new',
          style: { 
            color: '#2e7d32', 
            backgroundColor: '#e8f5e8', 
            padding: '2px 4px', 
            borderRadius: '4px',
            fontWeight: 'bold' 
          } 
        }, newValue)
      ),
      logMessage: message,
      details: {
        userName,
        itemName,
        action,
        oldValue,
        newValue,
        ...extractDetailsFromMessage(originalData)
      }
    };
  }

  // Pattern d'ajout
  if (additionMatch !== null) {
    const [, userName, itemName, quantity] = additionMatch;
    return {
      displayMessage: React.createElement('span', { key: 'addition' },
        React.createElement('strong', { 
          key: 'user',
          style: { color: '#1976d2', fontWeight: 'bold' } 
        }, userName),
        ' a ajouté ',
        React.createElement('strong', { 
          key: 'item',
          style: { color: '#2e7d32', fontWeight: 'bold' } 
        }, itemName),
        React.createElement('span', { 
          key: 'quantity',
          style: { 
            color: '#1976d2', 
            backgroundColor: '#e3f2fd', 
            padding: '2px 4px', 
            borderRadius: '4px',
            fontWeight: 'bold' 
          } 
        }, ` (${quantity})`),
        ' à l\'inventaire'
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
  if (generalMatch !== null) {
    const [, userName, action, item, details] = generalMatch;
    return {
      displayMessage: React.createElement('span', { key: 'general' },
        React.createElement('strong', { 
          key: 'user',
          style: { color: '#1976d2', fontWeight: 'bold' } 
        }, userName),
        ' a ',
        React.createElement('em', { 
          key: 'action',
          style: { color: '#f57c00', fontStyle: 'italic' } 
        }, action),
        ' ',
        React.createElement('strong', { 
          key: 'item',
          style: { color: '#2e7d32', fontWeight: 'bold' } 
        }, item),
        details ? React.createElement('span', { 
          key: 'details',
          style: { color: '#666', fontStyle: 'italic' }
        }, ` : ${details}`) : null
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
      displayMessage: React.createElement('span', { key: 'fallback' },
        React.createElement('strong', { 
          key: 'first',
          style: { color: '#1976d2', fontWeight: 'bold' } 
        }, firstWord),
        ' ',
        restOfMessage
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
  
  const baseMessage = typeof displayData.displayMessage === 'string' 
    ? displayData.displayMessage 
    : displayData.logMessage;
  
  if (!details) return baseMessage;

  let description = baseMessage;

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

  return description;
}

/**
 * Obtient le composant d'icône Material-UI approprié
 */
export function getNotificationIcon(module: string, actionType: string): React.ReactElement {
  // Icônes par module
  const moduleIcons: Record<string, React.ReactElement> = {
    'CHEMICALS': React.createElement(Science),
    'EQUIPMENT': React.createElement(Biotech),
    'USERS': React.createElement(Person),
    'CALENDAR': React.createElement(Event),
    'ORDERS': React.createElement(ShoppingCart),
    'SECURITY': React.createElement(Security),
    'SYSTEM': React.createElement(Settings),
    'ROOMS': React.createElement(Business),
    'NOTEBOOK': React.createElement(MenuBook),
    'AUDIT': React.createElement(Assignment)
  };

  // Icônes par action
  const actionIcons: Record<string, React.ReactElement> = {
    'CREATE': React.createElement(Add),
    'UPDATE': React.createElement(Edit),
    'DELETE': React.createElement(Delete),
    'READ': React.createElement(Visibility),
    'POST': React.createElement(Send),
    'GET': React.createElement(GetApp)
  };

  return moduleIcons[module] || 
         actionIcons[actionType] || 
         React.createElement(Notifications);
}

/**
 * Obtient la couleur d'affichage selon la sévérité
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
 * Formate la date de façon relative
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
  
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}
