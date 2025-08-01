import React from 'react';

// Interface pour les notifications (version simplifiée)
interface WebSocketNotification {
  id: string;
  message: string;
  module?: string;
  actionType?: string;
  severity: string;
  entityType?: string;
  entityId?: string;
  isRead?: boolean;
  createdAt?: string;
  timestamp?: string;
}

// Fonction pour parser les messages de notification et mettre en évidence les éléments importants
export function parseNotificationMessage(message: string): {
  displayMessage: React.ReactElement;
  userName?: string;
  itemName?: string;
  action?: string;
  details?: string;
} {
  // Expression régulière pour capturer les éléments principaux du message
  const patterns = {
    // Capture: [Utilisateur] a [action] [item] : [détails]
    general: /^(.+?)\s+a\s+(ajouté|modifié|supprimé|déplacé|changé)\s+(.+?)(?:\s*:\s*(.+))?$/i,
    // Capture pour les changements spécifiques (quantité, localisation, etc.)
    change: /^(.+?)\s+a\s+(modifié|changé|déplacé)\s+(.+?)\s+(?:de\s+)?(.+?)\s*:\s*(.+)\s*→\s*(.+)$/i,
    // Capture pour les ajouts
    addition: /^(.+?)\s+a\s+ajouté\s+(.+?)\s*\((.+?)\)\s+à\s+l'inventaire$/i,
  };

  // Fonction simple pour créer du texte en gras
  const createBoldText = (text: string, key: string) => 
    React.createElement('strong', { key }, text);
  
  const createSpan = (content: React.ReactNode, style?: React.CSSProperties, key?: string) =>
    React.createElement('span', { style, key }, content);

  // Essayer de matcher le pattern de changement
  const changeMatch = message.match(patterns.change);
  if (changeMatch) {
    const [, userName, action, property, item, oldValue, newValue] = changeMatch;
    
    return {
      displayMessage: React.createElement('span', {},
        createBoldText(userName, 'user'), ' a ', action, ' ', property, ' de ', createBoldText(item, 'item'), ' : ',
        createSpan(oldValue, { textDecoration: 'line-through', color: '#666' }, 'old'), ' → ',
        createBoldText(newValue, 'new')
      ),
      userName,
      itemName: item,
      action,
      details: `${oldValue} → ${newValue}`
    };
  }

  // Essayer de matcher le pattern d'ajout
  const additionMatch = message.match(patterns.addition);
  if (additionMatch) {
    const [, userName, itemName, quantity] = additionMatch;
    
    return {
      displayMessage: React.createElement('span', {},
        createBoldText(userName, 'user'), ' a ajouté ', createBoldText(itemName, 'item'),
        createSpan(` (${quantity})`, { color: '#1976d2' }, 'quantity'), ' à l\'inventaire'
      ),
      userName,
      itemName,
      action: 'ajouté',
      details: quantity
    };
  }

  // Pattern général
  const generalMatch = message.match(patterns.general);
  if (generalMatch) {
    const [, userName, action, item, details] = generalMatch;
    
    return {
      displayMessage: React.createElement('span', {},
        createBoldText(userName, 'user'), ' a ', action, ' ', createBoldText(item, 'item'),
        details ? createSpan(` : ${details}`, { color: '#666' }, 'details') : null
      ),
      userName,
      itemName: item,
      action,
      details
    };
  }

  // Si aucun pattern ne correspond, retourner le message original avec le premier mot en gras
  const parts = message.split(' ');
  const firstWord = parts[0];
  const restOfMessage = parts.slice(1).join(' ');

  return {
    displayMessage: React.createElement('span', {},
      createBoldText(firstWord, 'first'), ' ', restOfMessage
    ),
    userName: firstWord,
    action: 'action',
    details: message
  };
}

// Fonction pour obtenir une description détaillée basée sur le type de notification
export function getDetailedDescription(
  notification: WebSocketNotification, 
  displayData: ReturnType<typeof parseNotificationMessage>
): string {
  const baseInfo = [
    `Module: ${notification.module}`,
    `Action: ${notification.actionType}`,
    `Sévérité: ${notification.severity}`,
  ];

  if (notification.entityType) {
    baseInfo.push(`Type d'entité: ${notification.entityType}`);
  }

  if (notification.entityId) {
    baseInfo.push(`ID d'entité: ${notification.entityId}`);
  }

  return baseInfo.join('\n');
}

// Fonction pour obtenir l'icône appropriée selon le module et l'action
export function getNotificationIcon(module: string, actionType: string): string {
  const moduleIcons: { [key: string]: string } = {
    'CHEMICALS': '🧪',
    'EQUIPMENT': '🔬',
    'CALENDAR': '📅',
    'USERS': '👤',
    'AUDIT': '📋',
    'SYSTEM': '⚙️'
  };

  const actionIcons: { [key: string]: string } = {
    'CREATE': '➕',
    'UPDATE': '✏️',
    'DELETE': '🗑️',
    'POST': '📝'
  };

  return moduleIcons[module] || actionIcons[actionType] || '📢';
}

// Fonction pour obtenir la couleur selon la sévérité
export function getSeverityColor(severity: string) {
  const severityColors: { [key: string]: { color: 'error' | 'warning' | 'info' | 'success', bg: string } } = {
    'critical': { color: 'error', bg: '#ffebee' },
    'high': { color: 'error', bg: '#fff3e0' },
    'medium': { color: 'warning', bg: '#fff8e1' },
    'low': { color: 'info', bg: '#e3f2fd' }
  };

  return severityColors[severity] || severityColors['low'];
}

// Fonction pour formater le temps relatif
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'À l\'instant';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `Il y a ${minutes} min`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `Il y a ${hours}h`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  }
}
