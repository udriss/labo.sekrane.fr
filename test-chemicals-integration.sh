#!/bin/bash

# test-chemicals-integration.sh
# Script pour tester l'intégration complète des chemicals avec MySQL

echo "🧪 Test d'intégration des chemicals avec MySQL"
echo "=============================================="

# Fonction pour afficher les erreurs en rouge
print_error() {
    echo -e "\033[31m❌ $1\033[0m"
}

# Fonction pour afficher les succès en vert
print_success() {
    echo -e "\033[32m✅ $1\033[0m"
}

# Fonction pour afficher les infos en bleu
print_info() {
    echo -e "\033[34mℹ️  $1\033[0m"
}

# Test 1: Vérifier que la base de données est accessible
echo ""
print_info "Test 1: Vérification de la connexion à la base de données"
if npx tsx -e "
import { query, closePool } from './lib/db.ts';
(async () => {
  try {
    await query('SELECT 1');
    console.log('✅ Connexion réussie');
    process.exit(0);
  } catch (e) {
    console.error('❌ Erreur de connexion:', e.message);
    process.exit(1);
  } finally {
    await closePool();
  }
})();
"; then
    print_success "Connexion à la base de données OK"
else
    print_error "Impossible de se connecter à la base de données"
    exit 1
fi

# Test 2: Vérifier que les tables existent
echo ""
print_info "Test 2: Vérification de l'existence des tables"
if npx tsx -e "
import { query, closePool } from './lib/db.ts';
(async () => {
  try {
    const tables = await query('SHOW TABLES LIKE \"chemicals\"');
    if (tables.length > 0) {
      console.log('✅ Table chemicals existe');
    } else {
      console.log('❌ Table chemicals n\'existe pas');
      process.exit(1);
    }
    
    const suppliers = await query('SHOW TABLES LIKE \"suppliers\"');
    if (suppliers.length > 0) {
      console.log('✅ Table suppliers existe');
    } else {
      console.log('❌ Table suppliers n\'existe pas');
      process.exit(1);
    }
    process.exit(0);
  } catch (e) {
    console.error('❌ Erreur:', e.message);
    process.exit(1);
  } finally {
    await closePool();
  }
})();
"; then
    print_success "Tables chemicals et suppliers existent"
else
    print_error "Problème avec les tables"
    exit 1
fi

# Test 3: Test d'insertion et de récupération
echo ""
print_info "Test 3: Test CRUD sur les chemicals"
if npx tsx test-chemicals-db.mjs; then
    print_success "Tests CRUD réussis"
else
    print_error "Échec des tests CRUD"
    exit 1
fi

# Test 4: Vérifier que les routes API fonctionnent
echo ""
print_info "Test 4: Démarrage du serveur de test"
# Vérifier si Next.js peut démarrer (compilation TypeScript)
if npm run build > /dev/null 2>&1; then
    print_success "Compilation TypeScript réussie"
else
    print_error "Erreurs de compilation TypeScript"
    echo "Détails des erreurs:"
    npm run build
    exit 1
fi

echo ""
print_success "🎉 Tous les tests d'intégration ont réussi !"
echo ""
print_info "Prochaines étapes recommandées:"
echo "1. Lancer le script de migration: npx tsx scripts/migrate-chemicals-to-mysql.mjs"
echo "2. Démarrer le serveur: npm run dev"
echo "3. Tester les routes /api/chemicals dans l'interface"
echo ""
print_info "Routes API disponibles:"
echo "   GET    /api/chemicals           - Liste tous les chemicals"
echo "   POST   /api/chemicals           - Crée un nouveau chemical"
echo "   GET    /api/chemicals/[id]      - Récupère un chemical spécifique"
echo "   PUT    /api/chemicals/[id]      - Met à jour un chemical"
echo "   DELETE /api/chemicals/[id]      - Supprime un chemical"
echo "   POST   /api/chemicals/update-forecast - Met à jour les prévisions"
