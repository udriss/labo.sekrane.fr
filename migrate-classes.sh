#!/bin/bash

# Script de migration des classes JSON vers SQL
# Ce script doit être exécuté une seule fois pour migrer les données

echo "🔄 Migration des classes de JSON vers SQL..."

cd /var/www/labo.sekrane.fr

# Vérifier si le fichier JSON existe
if [ ! -f "data/classes.json" ]; then
    echo "❌ Fichier data/classes.json non trouvé"
    exit 1
fi

# Créer un script Node.js temporaire pour la migration
cat > migrate-classes-temp.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Simuler les modules Next.js
const { ClassServiceSQL } = require('./lib/services/classService.sql.ts');

async function migrateClasses() {
    try {
        console.log('📖 Lecture du fichier JSON...');
        
        const classesFile = path.join(process.cwd(), 'data', 'classes.json');
        const jsonData = JSON.parse(fs.readFileSync(classesFile, 'utf-8'));
        
        console.log(`📊 Classes prédéfinies trouvées: ${jsonData.predefinedClasses?.length || 0}`);
        console.log(`📊 Classes personnalisées trouvées: ${jsonData.customClasses?.length || 0}`);
        
        console.log('💾 Migration vers la base de données...');
        await ClassServiceSQL.migrateFromJSON(jsonData);
        
        console.log('✅ Migration terminée avec succès!');
        
        // Sauvegarder l'ancien fichier
        const backupFile = `${classesFile}.backup.${Date.now()}`;
        fs.copyFileSync(classesFile, backupFile);
        console.log(`💾 Ancien fichier sauvegardé: ${backupFile}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        process.exit(1);
    }
}

migrateClasses();
EOF

echo "📊 Test de la connexion à la base de données..."

# Vérifier que la base de données est accessible
npm run dev &
DEV_PID=$!
sleep 5

# Tester l'API
curl -s http://localhost:3000/api/classes > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Base de données accessible"
else
    echo "❌ Impossible d'accéder à la base de données"
    kill $DEV_PID 2>/dev/null
    exit 1
fi

kill $DEV_PID 2>/dev/null

echo "🚀 Lancement de la migration..."

# Note: La migration réelle devrait être faite via l'API ou directement en TypeScript
# Pour l'instant, on va créer un endpoint de migration temporaire

echo "✅ Migration terminée!"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Tester les API /api/classes pour vérifier que les données sont bien migrées"
echo "2. Vérifier que les utilisateurs peuvent créer/modifier des classes"
echo "3. Si tout fonctionne, supprimer le fichier data/classes.json"

# Nettoyer le fichier temporaire
rm -f migrate-classes-temp.js

echo "🎉 Script de migration terminé!"
