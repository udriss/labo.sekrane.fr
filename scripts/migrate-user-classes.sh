#!/bin/bash

# Script pour migrer les classes personnalisées des utilisateurs
# vers la table classes centralisée

echo "🚀 Migration des classes personnalisées des utilisateurs..."
echo "=================================================="

# Exécuter la migration via l'API
curl -X POST "http://localhost:3000/api/migrate/user-classes" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}\n"

echo ""
echo "=================================================="
echo "✅ Migration terminée"

# Optionnel: Vérifier le résultat
echo ""
echo "🔍 Vérification des données migrées..."
echo "Consultez les logs de l'application pour plus de détails."
