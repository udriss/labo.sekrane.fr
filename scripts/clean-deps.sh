#!/bin/bash

echo "🧹 ANALYSE DES DÉPENDANCES INUTILES"
echo "=================================="

echo ""
echo "📦 1. Vérification des dépendances avec depcheck..."
echo ""
npx depcheck --ignores="@types/*,eslint-config-*,@commitlint/*" --skip-missing

echo ""
echo "🔍 2. Recherche des imports non utilisés..."
echo ""
npx unimported

echo ""
echo "📋 3. Vérification des packages obsolètes..."
echo ""
npx npm-check --skip-unused

echo ""
echo "✅ Analyse terminée !"
echo ""
echo "💡 Commandes pour nettoyer :"
echo "   npm uninstall <package-name>    # Supprimer un package"
echo "   npm update                      # Mettre à jour les packages"
echo "   npm audit fix                   # Corriger les vulnérabilités"
