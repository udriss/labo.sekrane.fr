#!/bin/bash

echo "🧪 Test des corrections du système de classes personnalisées"
echo "==========================================================="

BASE_URL="http://localhost:3000"

echo ""
echo "1. 📋 Test de récupération des classes via l'API unifiée..."
echo "--- [HTTP Response] ---"
curl -i -s "$BASE_URL/api/classes/" > /tmp/classes_api_response.txt
cat /tmp/classes_api_response.txt
echo "------------------------"
cat /tmp/classes_api_response.txt | grep -E '^HTTP/'
cat /tmp/classes_api_response.txt | tail -n +1 | grep -vE '^HTTP/' | jq '.' || echo "❌ Erreur API classes"

echo ""
echo "2. ➕ Test de création d'une classe personnalisée..."
echo "--- [HTTP Response] ---"
curl -i -s -X POST "$BASE_URL/api/classes/" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test-Class-'$(date +%s)'","type":"custom"}' > /tmp/classes_api_create_response.txt
cat /tmp/classes_api_create_response.txt
echo "------------------------"
cat /tmp/classes_api_create_response.txt | grep -E '^HTTP/'
cat /tmp/classes_api_create_response.txt | tail -n +1 | grep -vE '^HTTP/' | jq '.' || echo "❌ Erreur création classe"

echo ""
echo "3. 🔍 Test de vérification de classe existante..."
echo "--- [HTTP Response] ---"
curl -i -s -X POST "$BASE_URL/api/classes/" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test-Class-Duplicate","type":"custom"}' > /tmp/classes_api_duplicate_response.txt
cat /tmp/classes_api_duplicate_response.txt
echo "------------------------"
cat /tmp/classes_api_duplicate_response.txt | grep -E '^HTTP/'
cat /tmp/classes_api_duplicate_response.txt | tail -n +1 | grep -vE '^HTTP/' | jq '.'

echo ""
echo "Tentative de création de la même classe (doit échouer)..."
echo "--- [HTTP Response] ---"
curl -i -s -X POST "$BASE_URL/api/classes/" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test-Class-Duplicate","type":"custom"}' > /tmp/classes_api_duplicate2_response.txt
cat /tmp/classes_api_duplicate2_response.txt
echo "------------------------"
cat /tmp/classes_api_duplicate2_response.txt | grep -E '^HTTP/'
cat /tmp/classes_api_duplicate2_response.txt | tail -n +1 | grep -vE '^HTTP/' | jq '.'

echo ""
echo "4. 🏗️  Test de la structure de la table classes..."
echo "Connexion à MySQL pour vérifier la structure..."

mysql -h localhost -u int -p4Na9Gm8mdTVgnUp labo -e "
DESCRIBE classes;
SELECT COUNT(*) as total_classes, type, COUNT(*) as count 
FROM classes 
GROUP BY type;
" 2>/dev/null || echo "❌ Impossible de se connecter à MySQL"

echo ""
echo "5. 🔄 Test des hooks et composants..."
echo "Les tests des composants React nécessitent un environnement de développement actif."
echo "Vérifiez manuellement:"
echo "  - CreateTPDialog affiche les classes personnalisées en haut"
echo "  - EditEventDialog affiche les classes personnalisées en haut"
echo "  - Les ID de classes personnalisées sont visibles"
echo "  - Les groupes 'Mes classes personnalisées' et 'Classes prédéfinies' sont séparés"

echo ""
echo "==========================================================="
echo "✅ Tests terminés - Vérifiez les résultats ci-dessus"
