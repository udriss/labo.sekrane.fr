# Système de Notifications Amélioré

## Vue d'ensemble

Le système de notifications a été amélioré pour fournir des messages plus informatifs et parlants pour les utilisateurs finaux, tout en conservant les logs techniques pour le debugging.

## Structure des Messages

### Ancienne Structure
```json
{
  "message": "Action UPDATE effectuée sur chemical dans le module CHEMICALS"
}
```

### Nouvelle Structure
```json
{
  "message": {
    "messageToDisplay": "Administrateur a modifié la quantité de Acide sulfurique : 500ml → 250ml",
    "log_message": "Action UPDATE effectuée sur chemical dans le module CHEMICALS",
    "change_details": {
      "field": "quantity",
      "old_value": "500ml",
      "new_value": "250ml",
      "chemical_name": "Acide sulfurique"
    }
  }
}
```

## Composants Mis à Jour

### 1. `/lib/api/with-audit.ts`
- **Fonction**: `createEnhancedNotificationMessage`
- **Amélioration**: Génère des messages structurés avec `messageToDisplay` et `log_message`
- **Modules supportés**: CHEMICALS, EQUIPMENT
- **Fonctionnalités**:
  - Messages utilisateur personnalisés selon l'action (CREATE, UPDATE, DELETE)
  - Détails des changements avec valeurs avant/après
  - Gestion des champs spécifiques par module

### 2. `/lib/utils/notification-messages.ts`
- **Fonctions utilitaires**:
  - `parseNotificationMessage()`: Parse les messages JSON ou chaînes simples
  - `getDetailedDescription()`: Génère des descriptions détaillées des changements
  - `getNotificationIcon()`: Retourne les icônes appropriées selon le module
  - `getSeverityColor()`: Détermine les couleurs selon la sévérité
  - `formatRelativeTime()`: Formate les temps relatifs

### 3. `/components/notifications/NotificationItem.tsx`
- **Nouveau composant** pour l'affichage riche des notifications
- **Fonctionnalités**:
  - Mode compact pour la navbar
  - Mode étendu pour la page des notifications
  - Affichage des détails avec expansion/collapse
  - Actions intégrées (marquer comme lu, supprimer)
  - Codes couleur selon la sévérité
  - Icônes contextuelles

### 4. `/components/layout/NavbarLIMS.tsx`
- **Intégration** du nouveau composant `NotificationItem`
- **Suppression** des fonctions utilitaires obsolètes
- **Mode compact** pour l'affichage dans la navbar

### 5. `/app/notifications/page.tsx`
- **Utilisation** du nouveau composant avec mode étendu
- **Actions** intégrées pour la gestion des notifications
- **Affichage détaillé** des changements

## Exemples d'Usage

### Notification de Modification de Produit Chimique
```json
{
  "messageToDisplay": "Jean Dupont a modifié la quantité de Acide sulfurique : 500ml → 250ml",
  "log_message": "Action UPDATE effectuée sur chemical dans le module CHEMICALS",
  "change_details": {
    "field": "quantity",
    "old_value": "500ml",
    "new_value": "250ml",
    "chemical_name": "Acide sulfurique"
  }
}
```

### Notification d'Ajout d'Équipement
```json
{
  "messageToDisplay": "Marie Martin a ajouté un nouvel équipement : Spectromètre UV-Vis (UV-001)",
  "log_message": "Action CREATE effectuée sur equipment dans le module EQUIPMENT", 
  "change_details": {
    "equipment_name": "Spectromètre UV-Vis",
    "serial_number": "UV-001",
    "location": "Laboratoire A"
  }
}
```

## Avantages

1. **Messages Utilisateur Clairs**: 
   - "Jean a modifié la quantité de Acide sulfurique : 500ml → 250ml"
   - Au lieu de: "Action UPDATE effectuée sur chemical dans le module CHEMICALS"

2. **Informations Contextuelles**:
   - Qui a fait l'action
   - Quel objet a été modifié
   - Quels changements ont été effectués
   - Valeurs avant/après

3. **Double Niveau d'Information**:
   - Message simplifié pour l'utilisateur final
   - Log technique pour le debugging

4. **Extensibilité**:
   - Facile d'ajouter de nouveaux modules
   - Structure flexible pour différents types de changements
   - Support de la traduction future

5. **Compatibilité**:
   - Gestion des anciens messages existants
   - Migration transparente

## Configuration

### Ajout d'un Nouveau Module

1. **Étendre `createEnhancedNotificationMessage`** dans `/lib/api/with-audit.ts`
2. **Ajouter les icônes** dans `getNotificationIcon()` 
3. **Définir les messages** pour chaque action (CREATE, UPDATE, DELETE)
4. **Tester** avec le script de validation

### Personnalisation des Messages

Les messages peuvent être personnalisés en modifiant les fonctions de création dans `with-audit.ts` selon les besoins spécifiques de chaque module.

## Tests

Utiliser les scripts de test inclus:
- `test-notification-structure.cjs`: Valide la structure JSON
- `test-enhanced-notifications.cjs`: Test complet (nécessite compilation TypeScript)

## Migration

Le système est rétrocompatible. Les anciennes notifications continuent de fonctionner avec un affichage de base, tandis que les nouvelles utilisent le format enrichi automatiquement.
