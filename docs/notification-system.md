# Système de Notifications SSE (Server-Sent Events)

## Vue d'ensemble

Le système de notifications utilise Server-Sent Events (SSE) pour envoyer des notifications en temps réel aux utilisateurs connectés. Il inclut un système de queue robuste pour gérer les notifications de manière séquentielle et éviter les conditions de concurrence.

## Architecture

### 1. Backend - Route SSE (`app/api/notifications/ws/route.ts`)

#### Fonctionnalités principales :

- **Connexions SSE persistantes** : Maintient des connexions ouvertes avec les clients
- **Système de queue** : Traite les notifications de manière séquentielle
- **IDs uniques** : Chaque notification a un ID unique pour éviter les doublons
- **Heartbeat** : Maintient les connexions actives avec des pings réguliers
- **Nettoyage automatique** : Supprime les connexions inactives

#### Structure des données :

```typescript
interface NotificationMessage {
  type: 'notification' | 'connected' | 'heartbeat' | 'status';
  userId?: string;
  userRole?: string;
  data?: any;
  timestamp?: number;
  notificationId?: string; // ID unique pour chaque notification
}

interface QueueItem {
  id: string;
  message: NotificationMessage;
  targetUserId?: string;
  targetRoles?: string[];
  timestamp: number;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  retries: number;
}
```

#### Endpoints :

1. **GET /api/notifications/ws** : Établit une connexion SSE
2. **POST /api/notifications/ws** : Actions disponibles :
   - `status` : Obtenir le statut des connexions et de la queue
   - `broadcast` : Diffuser un message via la queue
   - `test` : Créer une notification de test
   - `create-and-notify` : Créer et diffuser une notification

### 2. Frontend - Hook SSE (`lib/hooks/useNotificationSSE.ts`)

#### Fonctionnalités :

- **Reconnexion automatique** : Se reconnecte en cas de perte de connexion
- **Gestion des doublons** : Évite de traiter deux fois la même notification
- **Backoff exponentiel** : Augmente le délai entre les tentatives de reconnexion
- **État de connexion** : Expose l'état de la connexion et les informations

#### Utilisation :

```typescript
const { isConnected, connectionInfo, reconnect } = useNotificationSSE({
  onNotification: (notification) => {
    // Traiter la notification
  },
  onConnected: () => {
    // Connexion établie
  },
  onError: (error) => {
    // Gérer l'erreur
  }
});
```

### 3. Page de test (`app/test-notifications/page.tsx`)

Page dédiée pour tester le système de notifications avec :
- Statut en temps réel des connexions SSE
- Envoi de notifications de test
- Visualisation de la queue
- Affichage des notifications reçues

## Flux de données

1. **Création de notification** :
   - Une notification est créée (via API ou action utilisateur)
   - Elle est ajoutée à la queue avec un ID unique
   - Le système de queue la traite séquentiellement

2. **Traitement de la queue** :
   - Les notifications sont traitées une par une
   - Chaque notification est envoyée aux connexions ciblées
   - En cas d'échec, jusqu'à 3 tentatives sont effectuées
   - Les notifications réussies sont retirées de la queue

3. **Réception côté client** :
   - Le hook SSE reçoit la notification
   - Vérifie qu'elle n'a pas déjà été traitée (via son ID)
   - Déclenche le callback `onNotification`

## Configuration et optimisations

### Paramètres importants :

- **Heartbeat** : 15 secondes
- **Timeout de connexion** : 60 secondes
- **Nettoyage des connexions** : Toutes les 30 secondes
- **Traitement de la queue** : Toutes les 100ms entre chaque notification
- **Vérification de la queue** : Toutes les 5 secondes
- **Tentatives maximum** : 3 par notification

### Headers SSE :

```javascript
{
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no', // Désactiver la mise en cache nginx
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Cache-Control, Authorization',
  'Access-Control-Allow-Credentials': 'true'
}
```

## Gestion des erreurs

### Erreurs courantes et solutions :

1. **"Controller is already closed"** :
   - Cause : Tentative d'écriture sur une connexion fermée
   - Solution : Vérification de l'état `isActive` avant l'envoi

2. **Connexions perdues** :
   - Cause : Timeout réseau, fermeture du navigateur
   - Solution : Reconnexion automatique avec backoff exponentiel

3. **Notifications manquées** :
   - Cause : Connexion temporairement indisponible
   - Solution : Système de retry dans la queue

## Sécurité

- **Authentification** : Vérification de la session NextAuth
- **Autorisation** : Ciblage par rôle utilisateur
- **Isolation** : Chaque utilisateur a sa propre connexion

## Monitoring

La page de test (`/test-notifications`) permet de :
- Voir les connexions actives
- Monitorer la queue
- Tester l'envoi de notifications
- Vérifier la réception en temps réel

## Bonnes pratiques

1. **Ne pas surcharger la queue** : Éviter d'envoyer trop de notifications simultanément
2. **Utiliser les IDs uniques** : Toujours inclure un `notificationId` pour éviter les doublons
3. **Cibler les notifications** : Utiliser `targetRoles` ou `targetUserId` pour limiter la diffusion
4. **Gérer les déconnexions** : Implémenter une logique de récupération côté client

## Exemple d'utilisation

### Envoyer une notification depuis une API :

```typescript
import { sendNotification } from '@/app/api/notifications/ws/route';

// Dans votre API route
const notification = {
  id: 'unique-id',
  message: 'Nouvelle commande reçue',
  severity: 'medium',
  timestamp: new Date().toISOString()
};

sendNotification(notification, ['ADMIN', 'MANAGER']);
```

### Créer et diffuser une notification :

```typescript
const response = await fetch('/api/notifications/ws', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create-and-notify',
    targetRoles: ['ADMIN'],
    module: 'orders',
    actionType: 'new_order',
    message: 'Nouvelle commande #123',
    details: 'Commande de produits chimiques',
    severity: 'medium'
  })
});
```

## Dépannage

### Les notifications n'apparaissent pas :

1. Vérifier la connexion SSE dans la console du navigateur
2. Vérifier le statut via `/api/notifications/ws` (action: 'status')
3. S'assurer que l'utilisateur est authentifié
4. Vérifier les logs serveur pour les erreurs

### Notifications en double :

1. Vérifier que chaque notification a un ID unique
2. S'assurer que le hook SSE n'est pas monté plusieurs fois
3. Vérifier la logique de déduplication côté client

### Performance :

1. Limiter le nombre de notifications stockées côté client
2. Nettoyer régulièrement les anciennes notifications
3. Optimiser la taille des messages envoyés