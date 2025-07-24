# Documentation - Page Journaux d'Audit (/logs)

## Vue d'ensemble

La page `/logs` fournit une interface moderne et percutante pour consulter tous les journaux d'audit du système LABO LIMS. Elle utilise les composants Material-UI existants et respecte le design actuel de l'application.

## Accès et Permissions

### Contrôle d'Accès
- **Authentification requise** : Redirection automatique vers `/auth/signin` si non connecté
- **Permissions par rôle** :
  - **ADMIN** : Accès complet à tous les logs de tous les utilisateurs
  - **TEACHER** : Accès complet à tous les logs de tous les utilisateurs  
  - **STUDENT/USER** : Accès limité à ses propres activités uniquement

### Niveaux de Visibilité
```typescript
const hasFullAccess = userRole === 'ADMIN' || userRole === 'TEACHER';
// hasFullAccess détermine l'affichage des statistiques globales
// et la visibilité des actions d'autres utilisateurs
```

## Interface Utilisateur

### Header de la Page
```jsx
<div className="mb-8">
  <h1 className="text-3xl font-bold text-gray-900">
    Journaux d'Audit
  </h1>
  <p className="mt-2 text-sm text-gray-600">
    Consultation des activités et événements du système LABO LIMS
  </p>
  
  {/* Badge de statut en temps réel */}
  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse">
    Système actif
  </div>
</div>
```

### Composant Principal
- **Composant utilisé** : `AuditLogViewer` (existant dans `/components/audit/`)
- **Design** : Interface moderne avec Material-UI
- **Responsive** : Adaptatif mobile/desktop
- **Layout** : Intégré dans le layout principal avec navigation

## Fonctionnalités

### 1. **Tableau des Logs**
- **Colonnes** :
  - Horodatage (format français)
  - Utilisateur (si accès complet)
  - Module (avec icônes)
  - Action (avec badges colorés)
  - Entité cible
  - Statut (Succès/Erreur/Avertissement)
  - Adresse IP
  - Actions (bouton détails)

### 2. **Filtrage Avancé**
- **Recherche textuelle** : Barre de recherche globale
- **Filtres par critères** :
  - Module (USERS, CHEMICALS, EQUIPMENT, etc.)
  - Action (CREATE, READ, UPDATE, DELETE, etc.)
  - Statut (SUCCESS, ERROR, WARNING)
  - Plage de dates avec DateTimePicker
- **Actualisation** : Bouton refresh temps réel

### 3. **Pagination**
- **Options** : 10, 25, 50, 100 entrées par page
- **Navigation** : Boutons précédent/suivant
- **Compteur** : "X-Y sur Z" en français
- **Performance** : Chargement à la demande

### 4. **Détails des Événements**
- **Modal popup** : Clic sur l'icône "œil" 
- **Informations complètes** :
  - Données utilisateur complètes
  - Contexte technique (IP, User-Agent, etc.)
  - Détails de l'action (avant/après si disponible)
  - Métadonnées additionnelles
- **Format JSON** : Affichage formaté des détails

### 5. **Statistiques (Admins/Teachers)**
- **Cards de métriques** :
  - Total des entrées
  - Nombre de succès
  - Nombre d'erreurs  
  - Nombre d'avertissements
- **Icônes colorées** : Codes visuels par type
- **Mise à jour temps réel**

## Style et Design

### Thème Material-UI
```jsx
// Couleurs par statut
const getStatusColor = (status: string) => {
  switch (status) {
    case 'SUCCESS': return 'success';
    case 'ERROR': return 'error'; 
    case 'WARNING': return 'warning';
    default: return 'default';
  }
};
```

### Layout Responsive
```jsx
<div className="min-h-screen bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Contenu adaptatif */}
  </div>
</div>
```

### Composants Visuels
- **Cards élevées** : `elevation={2}` pour les sections importantes
- **Chips colorés** : Pour modules, actions et statuts
- **Avatars** : Initiales des utilisateurs
- **Icônes contextuelles** : Material Design Icons
- **Animations** : Pulse pour indicateur de statut

## Intégration avec l'Audit System

### Source des Données
```typescript
// Les données proviennent du système d'audit JSON
const logsData = await fetch('/api/audit/query', {
  method: 'POST',
  body: JSON.stringify(filters)
});
```

### Types TypeScript
```typescript
interface LogEntry {
  id: string;
  timestamp: string;
  user: AuditUser;
  action: AuditAction;
  context: AuditContext;
  status: 'SUCCESS' | 'ERROR' | 'WARNING';
  details?: AuditDetails;
}
```

## Navigation et Accès

### URL
```
https://labo.sekrane.fr/logs
```

### Menu de Navigation
La page doit être ajoutée au menu principal pour les utilisateurs autorisés :

```jsx
// Dans le layout principal
{(userRole === 'ADMIN' || userRole === 'TEACHER') && (
  <MenuItem component={Link} href="/logs">
    <TimelineIcon sx={{ mr: 1 }} />
    Journaux d'Audit
  </MenuItem>
)}
```

## Performance et Optimisation

### Chargement des Données
- **Pagination côté serveur** : Évite le chargement de tous les logs
- **Filtrage optimisé** : Requêtes ciblées selon les critères
- **Cache intelligent** : Mise en cache des résultats récents
- **Debouncing** : Sur la recherche textuelle

### Optimisations UI/UX
- **Skeleton loading** : États de chargement fluides
- **Lazy loading** : Chargement à la demande des détails
- **Responsive design** : Adaptatif mobile
- **Feedback utilisateur** : Messages d'erreur clairs

## Sécurité

### Validation d'Accès
```typescript
// Vérification automatique des permissions
if (!session?.user) {
  redirect('/auth/signin');
}

const userRole = (session.user as any).role;
const hasFullAccess = userRole === 'ADMIN' || userRole === 'TEACHER';
```

### Filtrage des Données
- **Isolation par utilisateur** : Les utilisateurs normaux ne voient que leurs logs
- **Masquage sensible** : Certaines données peuvent être masquées
- **Audit des consultations** : Les accès aux logs sont eux-mêmes audités

## Tests et Validation

### Test de Fonctionnement
```bash
# Démarrer le serveur de développement
npm run dev

# Accéder à la page
open http://localhost:3000/logs

# Tester les différents rôles d'utilisateur
```

### Scénarios de Test
1. **Accès non autorisé** → Redirection signin
2. **Utilisateur normal** → Voit uniquement ses logs
3. **Admin/Teacher** → Voit tous les logs + statistiques
4. **Filtrage** → Résultats cohérents avec les critères
5. **Pagination** → Navigation fluide entre pages
6. **Détails** → Modal s'ouvre avec infos complètes

## Maintenance et Évolutions

### Améliorations Prévues
1. **Export PDF/Excel** : Boutons d'export des données filtrées
2. **Graphiques** : Visualisations temporelles des activités
3. **Alertes** : Notifications pour événements critiques
4. **Recherche avancée** : Syntaxe de requête complexe
5. **Dashboard temps réel** : WebSocket pour mises à jour live

### Monitoring
- **Performances** : Temps de chargement des requêtes
- **Utilisation** : Fréquence d'accès par utilisateur
- **Erreurs** : Logging des problèmes d'affichage

---

**La page /logs est maintenant opérationnelle avec une interface moderne et percutante !** 🎉
