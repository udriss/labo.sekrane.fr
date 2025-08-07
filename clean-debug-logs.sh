#!/bin/bash

# Script pour supprimer tous les logs de debug des fichiers timeslots

echo "🧹 Nettoyage des logs de debug des fichiers timeslots..."

# Fonction pour nettoyer un fichier
clean_debug_logs() {
    local file="$1"
    echo "   Nettoyage de $file..."
    
    # Supprimer les lignes de debug console.log avec emojis
    sed -i '/console\.log.*🔍.*\[.*\]/d' "$file"
    sed -i '/console\.log.*📊.*\[.*\]/d' "$file"
    sed -i '/console\.log.*✅.*\[.*\]/d' "$file"
    sed -i '/console\.log.*🎯.*\[.*\]/d' "$file"
    sed -i '/console\.log.*⚠️.*\[.*\]/d' "$file"
    sed -i '/console\.log.*🚀.*\[.*\]/d' "$file"
    
    # Supprimer les lignes console.log debug specifiques
    sed -i '/console\.log.*DEBUG.*createChemistry/d' "$file"
    sed -i '/console\.log.*DEBUG.*API route/d' "$file"
    
    echo "   ✅ $file nettoyé"
}

# Nettoyer les fichiers principaux
clean_debug_logs "lib/timeslots-database.ts"
clean_debug_logs "lib/timeslots-integration.ts" 
clean_debug_logs "lib/calendar-utils-timeslots.ts"
clean_debug_logs "app/api/timeslots/route.ts"
clean_debug_logs "app/api/calendrier/chimie/route.ts"

echo ""
echo "🎉 Nettoyage terminé ! Tous les logs de debug ont été supprimés."
echo "ℹ️  Les logs d'erreur et informatifs ont été conservés."
