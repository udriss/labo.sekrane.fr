'use client';

import React from 'react';
import { formatNotificationForUI, getNotificationIcon, getSeverityColor, getSeverityBadge } from '@/lib/utils/notification-display';

interface NotificationItemProps {
  notification: {
    id: number;
    user_id: number;
    module: string;
    action_type: string;
    severity: string;
    message: any;
    created_at: string;
    read_at?: string;
    user?: {
      first_name: string;
      last_name: string;
    };
  };
  onClick?: (notification: any) => void;
  onMarkAsRead?: (notificationId: number) => void;
}

/**
 * Composant pour afficher une notification individuelle avec le nouveau format amélioré
 */
export function NotificationItem({ notification, onClick, onMarkAsRead }: NotificationItemProps) {
  const displayMessage = formatNotificationForUI(notification);
  const icon = getNotificationIcon(notification.module, notification.action_type);
  const severityColor = getSeverityColor(notification.severity);
  const severityBadge = getSeverityBadge(notification.severity);
  const isUnread = !notification.read_at;

  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    }
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div
      className={`
        p-4 border-l-4 cursor-pointer transition-all duration-200 hover:bg-gray-50
        ${isUnread ? 'border-l-blue-500 bg-blue-50' : 'border-l-gray-300 bg-white'}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        {/* Icône */}
        <div className="flex-shrink-0 text-xl">
          {icon}
        </div>
        
        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          {/* Titre avec badge de sévérité */}
          <div className="flex items-center space-x-2 mb-1">
            <span className={`text-sm font-medium ${severityColor}`}>
              {notification.module} - {notification.action_type}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityBadge}`}>
              {notification.severity}
            </span>
            {isUnread && (
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </div>
          
          {/* Message principal */}
          <p className="text-gray-900 text-sm leading-relaxed mb-2">
            {displayMessage}
          </p>
          
          {/* Métadonnées */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {notification.user 
                ? `${notification.user.first_name} ${notification.user.last_name}`
                : 'Utilisateur inconnu'
              }
            </span>
            <span>{formatTimeAgo(notification.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Composant pour afficher une liste de notifications
 */
interface NotificationListProps {
  notifications: any[];
  onNotificationClick?: (notification: any) => void;
  onMarkAsRead?: (notificationId: number) => void;
  onMarkAllAsRead?: () => void;
  loading?: boolean;
  error?: string | null;
}

export function NotificationList({ 
  notifications, 
  onNotificationClick, 
  onMarkAsRead, 
  onMarkAllAsRead,
  loading = false,
  error = null 
}: NotificationListProps) {
  const unreadCount = notifications.filter(n => !n.read_at).length;

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-500 mt-2">Chargement des notifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-2">⚠️</div>
        <p className="text-red-600">Erreur lors du chargement des notifications</p>
        <p className="text-gray-500 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 text-4xl mb-2">🔔</div>
        <p className="text-gray-500">Aucune notification</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* En-tête avec compteur et action */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </h3>
        {unreadCount > 0 && onMarkAllAsRead && (
          <button
            onClick={onMarkAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Liste des notifications */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClick={onNotificationClick}
            onMarkAsRead={onMarkAsRead}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Composant dropdown pour les notifications dans la barre de navigation
 */
interface NotificationDropdownProps {
  notifications: any[];
  isOpen: boolean;
  onToggle: () => void;
  onNotificationClick?: (notification: any) => void;
  onMarkAsRead?: (notificationId: number) => void;
  onViewAll?: () => void;
}

export function NotificationDropdown({
  notifications,
  isOpen,
  onToggle,
  onNotificationClick,
  onMarkAsRead,
  onViewAll
}: NotificationDropdownProps) {
  const unreadCount = notifications.filter(n => !n.read_at).length;
  const recentNotifications = notifications.slice(0, 5); // Afficher seulement les 5 plus récentes

  return (
    <div className="relative">
      {/* Bouton de notification */}
      <button
        onClick={onToggle}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM7 7h5l5-5v5H7z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-900">Notifications récentes</h4>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length > 0 ? (
              recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={onNotificationClick}
                  onMarkAsRead={onMarkAsRead}
                />
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                Aucune notification récente
              </div>
            )}
          </div>
          
          {notifications.length > 5 && onViewAll && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={onViewAll}
                className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Voir toutes les notifications ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
