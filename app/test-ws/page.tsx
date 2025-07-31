// app/test-ws/page.tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useState } from 'react';

export default function TestWebSocketPage() {
  const { data: session, status } = useSession();
  const {
    isConnected,
    notifications,
    stats,
    connect,
    disconnect,
    sendMessage,
    markAsRead,
    clearNotifications
  } = useNotificationContext();

  const [testMessage, setTestMessage] = useState('Test WebSocket depuis la page');

  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/notifications/debug/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: testMessage,
          severity: 'high',
          module: 'SYSTEM',
          actionType: 'TEST_PAGE',
          targetRoles: ['ADMIN', 'USER', 'TEACHER', 'ADMINLABO', 'LABORANTIN']
        })
      });

      const result = await response.json();
      console.log('📤 Test notification envoyée:', result);
    } catch (error) {
      console.error('❌ Erreur envoi test:', error);
    }
  };

  if (status === 'loading') return <div>⏳ Chargement...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧪 Test WebSocket Notifications</h1>

      {/* Section authentification */}
      <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>🔐 Authentification</h3>
        {!session ? (
          <div>
            <p>❌ Non connecté</p>
            <button 
              onClick={() => signIn()}
              style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              Se connecter
            </button>
          </div>
        ) : (
          <div>
            <p>✅ Connecté en tant que: <strong>{session.user?.name}</strong> ({(session.user as any)?.role})</p>
            <button 
              onClick={() => signOut()}
              style={{ padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              Se déconnecter
            </button>
          </div>
        )}
      </div>

      {session && (
        <>
          {/* Section WebSocket */}
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px' }}>
            <h3>🔌 WebSocket</h3>
            <p>
              Statut: {' '}
              <span style={{ 
                color: isConnected ? 'green' : 'red',
                fontWeight: 'bold'
              }}>
                {isConnected ? '✅ Connecté' : '❌ Déconnecté'}
              </span>
            </p>
            <div style={{ marginBottom: '10px' }}>
              <button 
                onClick={connect}
                disabled={isConnected}
                style={{ 
                  padding: '8px 12px', 
                  marginRight: '10px',
                  backgroundColor: isConnected ? '#6c757d' : '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: isConnected ? 'not-allowed' : 'pointer' 
                }}
              >
                Connecter
              </button>
              <button 
                onClick={disconnect}
                disabled={!isConnected}
                style={{ 
                  padding: '8px 12px',
                  backgroundColor: !isConnected ? '#6c757d' : '#dc3545', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: !isConnected ? 'not-allowed' : 'pointer' 
                }}
              >
                Déconnecter
              </button>
            </div>
          </div>

          {/* Section test */}
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px' }}>
            <h3>📤 Envoyer notification test</h3>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Message de test"
                style={{ 
                  padding: '8px', 
                  width: '300px', 
                  marginRight: '10px',
                  border: '1px solid #ccc', 
                  borderRadius: '4px' 
                }}
              />
              <button 
                onClick={sendTestNotification}
                style={{ 
                  padding: '8px 12px',
                  backgroundColor: '#007bff', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer' 
                }}
              >
                Envoyer
              </button>
            </div>
          </div>

          {/* Section statistiques */}
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px' }}>
            <h3>📊 Statistiques</h3>
            <p>Notifications totales: <strong>{stats.totalNotifications}</strong></p>
            <p>Notifications non lues: <strong>{stats.unreadNotifications}</strong></p>
            <div>
              <h4>Par module:</h4>
              <ul>
                {Object.entries(stats.notificationsByModule).map(([module, count]) => (
                  <li key={module}>{module}: {count}</li>
                ))}
              </ul>
            </div>
            <button 
              onClick={clearNotifications}
              style={{ 
                padding: '8px 12px',
                backgroundColor: '#ffc107', 
                color: 'black', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}
            >
              Vider notifications
            </button>
          </div>

          {/* Section notifications */}
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>📨 Notifications reçues ({notifications.length})</h3>
            {notifications.length === 0 ? (
              <p style={{ color: '#666' }}>Aucune notification reçue</p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    style={{ 
                      padding: '10px', 
                      margin: '5px 0', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      backgroundColor: notif.isRead ? '#f8f9fa' : '#fff3cd'
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>
                      {notif.module}/{notif.actionType} - {notif.severity}
                    </div>
                    <div>{typeof notif.message === 'string' ? notif.message : JSON.stringify(notif.message)}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(notif.timestamp).toLocaleString()}
                      {!notif.isRead && (
                        <button 
                          onClick={() => markAsRead(notif.id)}
                          style={{ 
                            marginLeft: '10px',
                            padding: '2px 6px',
                            fontSize: '11px',
                            backgroundColor: '#007bff', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '3px', 
                            cursor: 'pointer' 
                          }}
                        >
                          Marquer lu
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
