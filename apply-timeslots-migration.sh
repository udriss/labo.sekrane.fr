#!/bin/bash
# Script pour# Appliquer la migration
echo "🚀 Application de la migration TimeSlots..."
if mysql -h"$DB_HOST" -u"$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" < sql/timeslots-migration-safe.sql; thenpliquer la migration TimeSlots
# Usage: ./apply-timeslots-migration.sh

echo "🔄 Application de la migration TimeSlots..."

# Charger les variables d'environnement
source .env

# Vérifier la connexion MySQL
echo "🔍 Vérification de la connexion à la base de données..."
echo "$DB_USER"
if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT 1;" &>/dev/null; then
    echo "✅ Connexion à la base de données réussie"
else
    echo "❌ Impossible de se connecter à la base de données"
    echo "Vérifiez vos variables d'environnement dans .env"
    exit 1
fi

# Sauvegarder la base de données
echo "💾 Création d'une sauvegarde avant migration..."
mysqldump -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "backup_before_timeslots_$(date +%Y%m%d_%H%M%S).sql"
echo "✅ Sauvegarde créée"

# Appliquer la migration
echo "🚀 Application de la migration TimeSlots..."
if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < sql/timeslots-migration-safe.sql; then
    echo "✅ Migration TimeSlots appliquée avec succès"
    
    # Vérifier les nouveaux champs
    echo "🔍 Vérification des modifications..."
    
        # Vérifier la colonne state
    if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE calendar_chimie;" | grep -q "state"; then
        echo "✅ Colonne 'state' ajoutée à calendar_chimie"
    else
        echo "❌ Erreur: Colonne 'state' non trouvée dans calendar_chimie"
    fi
    
    # Vérifier les colonnes timeSlots et actuelTimeSlots
    if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE calendar_chimie;" | grep -q "timeSlots"; then
        echo "✅ Colonne 'timeSlots' ajoutée à calendar_chimie"
    else
        echo "❌ Erreur: Colonne 'timeSlots' non trouvée dans calendar_chimie"
    fi
    
    if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE calendar_chimie;" | grep -q "actuelTimeSlots"; then
        echo "✅ Colonne 'actuelTimeSlots' ajoutée à calendar_chimie"
    else
        echo "❌ Erreur: Colonne 'actuelTimeSlots' non trouvée dans calendar_chimie"
    fi
    
    if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE calendar_physique;" | grep -q "state"; then
        echo "✅ Colonne 'state' ajoutée à calendar_physique"
    else
        echo "❌ Erreur: Colonne 'state' non trouvée dans calendar_physique"
    fi
    
    # Vérifier les données migrées
    CHIMIE_COUNT=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -s -N -e "SELECT COUNT(*) FROM calendar_chimie WHERE timeSlots IS NOT NULL;")
    PHYSIQUE_COUNT=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -s -N -e "SELECT COUNT(*) FROM calendar_physique WHERE timeSlots IS NOT NULL;")
    
    echo "📊 Résultats de la migration:"
    echo "   - Événements chimie avec TimeSlots: $CHIMIE_COUNT"
    echo "   - Événements physique avec TimeSlots: $PHYSIQUE_COUNT"
    
    echo ""
    echo "🎉 Migration TimeSlots terminée avec succès!"
    echo "ℹ️  Vous pouvez maintenant utiliser les nouvelles fonctionnalités:"
    echo "   - Approbation/rejet de créneaux horaires"
    echo "   - Gestion des états d'événements (PENDING, VALIDATED, etc.)"
    echo "   - Historique complet des modifications"
    
else
    echo "❌ Erreur lors de l'application de la migration"
    echo "🔄 Restauration de la sauvegarde recommandée"
    exit 1
fi
