#!/bin/bash

echo "🧹 Nettoyage automatique des dépendances inutilisées..."
echo "=================================================="

# Liste des dépendances inutilisées (confirmées par les 3 outils)
UNUSED_DEPS=(
    "@tailwindcss/postcss"
    "@tiptap/extension-text-align"
    "clsx"
    "critters"
    "dayjs"
    "global"
    "react-dnd"
    "react-dnd-html5-backend"
    "swr"
)

# Liste des devDependencies inutilisées
UNUSED_DEV_DEPS=(
    "@commitlint/cli"
    "@commitlint/config-conventional"
    "@testing-library/dom"
    "@testing-library/jest-dom"
    "@testing-library/react"
    "autoprefixer"
    "postcss"
    "rimraf"
    "tailwindcss"
    "ts-node"
    "undici"
    "web-streams-polyfill"
    "whatwg-fetch"
)

echo "Suppression des dépendances inutilisées..."
for dep in "${UNUSED_DEPS[@]}"; do
    echo "Suppression de $dep..."
    npm uninstall "$dep"
done

echo ""
echo "Suppression des devDependencies inutilisées..."
for dep in "${UNUSED_DEV_DEPS[@]}"; do
    echo "Suppression de $dep..."
    npm uninstall --save-dev "$dep"
done

echo ""
echo "✅ Nettoyage terminé !"
echo ""
echo "📦 Packages supprimés:"
echo "   Dépendances: ${#UNUSED_DEPS[@]} packages"
echo "   DevDependencies: ${#UNUSED_DEV_DEPS[@]} packages"
echo ""
echo "💡 Prochaines étapes recommandées:"
echo "   1. Tester votre application: npm run build && npm run test"
echo "   2. Mettre à jour les packages restants: npm update"
echo "   3. Vérifier la taille du node_modules: du -sh node_modules"
