# Système de Notifications MySQL - Guide d'Installation et d'Utilisation

## 🎯 Objectif
Ce système remplace le stockage JSON par un système persistant MySQL pour les configurations et préférences de notifications.

## 📋 Structure des Tables

### 1. `notification_configs`
Stocke les types de notifications disponibles avec leurs paramètres par défaut.
```sql
- id (varchar) : Identifiant unique de la configuration
- module (varchar) : Module concerné (USERS, CHEMICALS, etc.)
- action_type (varchar) : Type d'action (CREATE, UPDATE, etc.)
- name (varchar) : Nom de la notification
- description (text) : Description détaillée
- severity (enum) : Niveau de criticité (low, medium, high, critical)
- enabled (boolean) : Configuration activée ou non
- default_roles (json) : Rôles pour lesquels cette notification est activée par défaut
- metadata (json) : Données supplémentaires
- created_at, updated_at : Timestamps
```

### 2. `notification_preferences`
Stocke les préférences individuelles des utilisateurs.
```sql
- id (int auto_increment) : Clé primaire
- user_id (varchar) : ID de l'utilisateur
- user_role (varchar) : Rôle de l'utilisateur
- module (varchar) : Module concerné
- action_type (varchar) : Type d'action
- enabled (boolean) : Préférence activée ou non
- custom_settings (json) : Paramètres personnalisés
- created_at, updated_at : Timestamps
```

### 3. `notification_history`
Historique des notifications envoyées (pour futur usage).
```sql
- id (varchar) : Identifiant unique de la notification
- config_id (varchar) : Référence à la configuration
- recipient_user_id (varchar) : Destinataire
- title, message, details : Contenu de la notification
- status (enum) : Statut (pending, sent, delivered, failed, read)
- delivery_channel (enum) : Canal (in_app, email, sms, push)
- metadata (json) : Métadonnées
- sent_at, delivered_at, read_at : Timestamps de cycle de vie
```

## 🚀 Installation

### 1. Créer les tables MySQL
```bash
mysql -u root -p < sql/notification_configs.sql
```

### 2. Configurer les variables d'environnement
Dans `.env.local` :
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=labo_lims
```

### 3. Initialiser les données par défaut
```bash
# Initialiser tout le système
npx tsx scripts/init-data-folders.ts

# Ou seulement les notifications
npx tsx scripts/init-notification-system.ts
```

## 📁 Fichiers Modifiés

### Services
- `lib/services/NotificationConfigService.ts` : Service principal pour gérer les configurations et préférences
- `sql/notification_configs.sql` : Script de création des tables

### APIs
- `app/api/admin/notification-configs/route.ts` : API pour gérer les configurations
- `app/api/admin/notification-preferences/route.ts` : API pour gérer les préférences

### Scripts
- `scripts/init-notification-system.ts` : Initialisation du système MySQL
- `scripts/init-data-folders.ts` : Initialisation générale (inclut MySQL + fallback JSON)
- `scripts/init-notification-preferences.ts` : Script legacy adapté pour MySQL

### Interface (à adapter)
- `app/admin/notifications/page.tsx` : Page d'administration (nécessite adaptation pour utiliser les nouvelles APIs)

## 🔄 Fonctionnalités Principales

### NotificationConfigService

#### Gestion des Configurations
```typescript
// Récupérer toutes les configurations
const configs = await notificationConfigService.getAllConfigs();

// Récupérer par module
const chemicalConfigs = await notificationConfigService.getConfigsByModule('CHEMICALS');

// Créer une nouvelle configuration
await notificationConfigService.createConfig({
  id: 'custom_notification',
  module: 'CUSTOM',
  actionType: 'CUSTOM_ACTION',
  name: 'Ma notification personnalisée',
  description: 'Description de la notification',
  severity: 'medium',
  enabled: true,
  defaultRoles: ['ADMIN', 'TEACHER']
});
```

#### Gestion des Préférences
```typescript
// Créer/Mettre à jour une préférence utilisateur
await notificationConfigService.createOrUpdatePreference(
  'user123',
  'TEACHER', 
  'CHEMICALS',
  'STOCK_LOW',
  true // enabled
);

// Vérifier si un utilisateur doit recevoir une notification
const shouldNotify = await notificationConfigService.shouldNotify(
  'user123',
  'TEACHER',
  'CHEMICALS',
  'STOCK_LOW'
);
```

### APIs REST

#### Configurations (`/api/admin/notification-configs`)
- `GET` : Récupérer toutes les configurations + statistiques
- `POST` : Créer une configuration ou initialiser/réinitialiser le système
- `PUT` : Mettre à jour une configuration
- `DELETE` : Supprimer une configuration

#### Préférences (`/api/admin/notification-preferences`)
- `GET` : Récupérer les préférences (par utilisateur, par rôle, ou toutes)
- `POST` : Initialiser les préférences par défaut
- `PUT` : Mettre à jour les préférences par utilisateur ou par rôle
- `DELETE` : Supprimer les préférences d'un utilisateur

## 🎛️ Configuration par Défaut

Le système initialise automatiquement **40+ configurations** réparties sur **8 modules** :

### Modules et Actions Supportés
- **USERS** : NEW_USER_REGISTRATION, ACCOUNT_ACTIVATED, ROLE_CHANGED, CREATE, UPDATE, DELETE
- **CHEMICALS** : STOCK_LOW, EXPIRY_WARNING, NEW_ARRIVAL, CREATE, UPDATE, DELETE
- **EQUIPMENT** : MAINTENANCE_DUE, MALFUNCTION, CALIBRATION_DUE, CREATE, UPDATE, DELETE
- **ROOMS** : ROOM_RESERVED, BOOKING_CONFLICT, MAINTENANCE_SCHEDULED, CREATE, UPDATE, DELETE
- **CALENDAR** : EVENT_CREATED, EVENT_MODIFIED, EVENT_REMINDER, VALIDATE_EVENT, CREATE, UPDATE
- **ORDERS** : ORDER_DELIVERED, ORDER_DELAYED, ORDER_APPROVED, CREATE, UPDATE
- **SECURITY** : SECURITY_ALERT, ACCESS_DENIED, SUSPICIOUS_LOGIN, LOGIN, LOGOUT
- **SYSTEM** : MAINTENANCE, BACKUP_COMPLETED, UPDATE_AVAILABLE, ERROR

### Rôles par Défaut
- **ADMIN** : Accès à toutes les notifications système, utilisateurs, sécurité
- **ADMINLABO** : Notifications laboratoire (chimie, équipements, commandes)
- **TEACHER** : Notifications pédagogiques (calendrier, salles)
- **LABORANTIN** : Notifications techniques (maintenance, stocks)
- **GUEST** : Accès minimal

## 🔧 Migration depuis JSON

Le système maintient une **compatibilité descendante** :
1. Les fichiers JSON existants restent intacts
2. Les APIs détectent automatiquement la disponibilité de MySQL
3. En cas d'erreur MySQL, le système bascule sur JSON en fallback
4. Les scripts d'initialisation gèrent les deux systèmes

## 🧪 Tests et Validation

### Tester les APIs
```bash
# Récupérer les configurations
curl -X GET "http://localhost:3000/api/admin/notification-configs" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Initialiser les configurations
curl -X POST "http://localhost:3000/api/admin/notification-configs" \
  -H "Content-Type: application/json" \
  -d '{"action": "initialize"}'

# Mettre à jour des préférences par rôle
curl -X PUT "http://localhost:3000/api/admin/notification-preferences" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "TEACHER",
    "updates": [
      {"module": "CALENDAR", "actionType": "EVENT_CREATED", "enabled": true},
      {"module": "ROOMS", "actionType": "ROOM_RESERVED", "enabled": false}
    ]
  }'
```

## 📈 Prochaines Étapes

1. **Adapter l'interface admin** : Mettre à jour `app/admin/notifications/page.tsx`
2. **Tests d'intégration** : Valider le fonctionnement avec l'interface
3. **Gestion des notifications temps réel** : Utiliser `notification_history`
4. **Optimisations** : Index et cache pour les performances
5. **Monitoring** : Logs et métriques d'utilisation

## 🚨 Points d'Attention

- **Permissions** : Seuls ADMIN/ADMINLABO peuvent voir les configurations
- **Sécurité** : Toutes les APIs nécessitent une authentification
- **Performance** : Connexions MySQL mises en pool automatiquement
- **Fallback** : Le système JSON reste disponible en cas de problème MySQL
- **Migrations** : Les données existantes sont préservées

## 📞 Support

En cas de problème :
1. Vérifier les connexions MySQL
2. Consulter les logs d'erreur
3. Tester le fallback JSON
4. Vérifier les permissions des rôles utilisateur
