const fs = require('fs');

// Ajouter quelques notifications de test
async function addTestNotifications() {
  try {
    const notificationsFile = '/var/www/labo.sekrane.fr/data/notifications.json';
    const notifications = JSON.parse(fs.readFileSync(notificationsFile, 'utf8'));
    
    const testNotifications = [
      {
        id: `test-notification-${Date.now()}-1`,
        targetRoles: ['ADMIN', 'TEACHER', 'LABORANTIN'],
        module: 'CHEMICALS',
        actionType: 'CREATE',
        message: {
          fr: 'Un nouveau produit chimique a été ajouté',
          en: 'A new chemical has been added'
        },
        details: 'Test notification for debugging',
        createdAt: new Date().toISOString(),
        isRead: false,
        severity: 'medium',
        metadata: {
          entityType: 'chemical',
          entityId: 'test-123',
          triggeredBy: 'admin1'
        }
      },
      {
        id: `test-notification-${Date.now()}-2`,
        targetRoles: ['TEACHER'],
        module: 'EQUIPMENT',
        actionType: 'UPDATE',
        message: {
          fr: 'Un équipement a été modifié',
          en: 'Equipment has been updated'
        },
        details: 'Another test notification',
        createdAt: new Date().toISOString(),
        isRead: false,
        severity: 'low',
        metadata: {
          entityType: 'equipment',
          entityId: 'test-456',
          triggeredBy: 'teacher1'
        }
      }
    ];
    
    // Ajouter les notifications de test au début
    const updatedNotifications = [...testNotifications, ...notifications];
    
    fs.writeFileSync(notificationsFile, JSON.stringify(updatedNotifications, null, 2));
    
    
    
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

addTestNotifications();
