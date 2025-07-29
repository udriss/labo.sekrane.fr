'use client';

import React from 'react';
import { useNotificationContext } from './NotificationProvider';

interface NotificationListProps {
  className?: string;
  maxNotifications?: number;
}

export function NotificationList({ 
  className = '', 
  maxNotifications = 10 
}: NotificationListProps) {
  const { 
    notifications, 
    isConnected, 
    connectionStatus, 
    lastHeartbeat,
    reconnect,
    clearNotifications 
  } = useNotificationContext();

  const displayedNotifications = notifications.slice(0, maxNotifications);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connecté';
      case 'connecting': return 'Connexion...';
      case 'error': return 'Erreur';
      default: return 'Déconnecté';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      {/* Header avec statut de connexion */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Notifications</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className={`text-sm ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={reconnect}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Reconnecter
        </button>
        <button
          onClick={clearNotifications}
          className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          disabled={notifications.length === 0}
        >
          Effacer ({notifications.length})
        </button>
      </div>

      {/* Informations de debug */}
      {lastHeartbeat && (
        <div className="text-xs text-gray-500 mb-2">
          Dernier heartbeat: {new Date(lastHeartbeat).toLocaleTimeString()}
        </div>
      )}

      {/* Liste des notifications */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {displayedNotifications.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            Aucune notification
          </div>
        ) : (
          displayedNotifications.map((notification, index) => (
            <div
              key={notification.id || index}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">
                    {notification.title || 'Notification'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      notification.type === 'success' ? 'bg-green-100 text-green-800' :
                      notification.type === 'error' ? 'bg-red-100 text-red-800' :
                      notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {notification.type || 'info'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {notification.createdAt ? 
                        new Date(notification.createdAt).toLocaleTimeString() :
                        'Maintenant'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > maxNotifications && (
        <div className="text-center mt-2">
          <span className="text-sm text-gray-500">
            +{notifications.length - maxNotifications} autres notifications
          </span>
        </div>
      )}
    </div>
  );
}