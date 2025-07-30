#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fonction pour parcourir récursivement un répertoire
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    
    if (stats.isDirectory()) {
      walkDir(filepath, callback);
    } else if (stats.isFile()) {
      callback(filepath);
    }
  }
}

// Fonction pour vérifier si un fichier a besoin du runtime nodejs
function needsNodejsRuntime(content) {
  const patterns = [
    /import.*from ['"]fs['"]/, // fs import
    /import.*from ['"]path['"]/, // path import
    /import.*from ['"]crypto['"]/, // crypto import
    /import.*from ['"]bcrypt/, // bcrypt import
    /import.*from ['"]bcryptjs['"]/, // bcryptjs import
    /promises as fs/, // fs promises
    /require\(['"]fs['"]/, // require fs
    /require\(['"]path['"]/, // require path
    /require\(['"]crypto['"]/, // require crypto
    /ReadableStream/, // Server-Sent Events
    /setInterval/, // timers
    /setTimeout/, // timers
    /process\.env/, // process env (some cases)
  ];
  
  return patterns.some(pattern => pattern.test(content));
}

// Fonction pour ajouter la déclaration runtime si nécessaire
function addRuntimeDeclaration(content) {
  // Vérifier si la déclaration existe déjà
  if (content.includes("export const runtime = 'nodejs'")) {
    return { content, modified: false };
  }
  
  // Trouver la première ligne d'import ou d'export
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Chercher après les commentaires en début de fichier
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') || line.startsWith('*/') || line === '') {
      continue;
    }
    insertIndex = i;
    break;
  }
  
  // Insérer la déclaration runtime
  lines.splice(insertIndex, 0, "export const runtime = 'nodejs';", '');
  
  return { content: lines.join('\n'), modified: true };
}

// Main fonction
function main() {
  const apiDir = path.join(__dirname, '..', 'app', 'api');
  let totalFiles = 0;
  let modifiedFiles = 0;
  
  console.log('🔍 Analyse des routes API pour détecter celles qui ont besoin du runtime Node.js...\n');
  
  walkDir(apiDir, (filepath) => {
    // Ne traiter que les fichiers route.ts ou route.js
    if (!filepath.endsWith('route.ts') && !filepath.endsWith('route.js')) {
      return;
    }
    
    totalFiles++;
    
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      
      // Vérifier si le fichier a besoin du runtime nodejs
      if (needsNodejsRuntime(content)) {
        const result = addRuntimeDeclaration(content);
        
        if (result.modified) {
          fs.writeFileSync(filepath, result.content, 'utf-8');
          console.log(`✅ Modifié: ${path.relative(process.cwd(), filepath)}`);
          modifiedFiles++;
        } else {
          console.log(`⏭️  Déjà configuré: ${path.relative(process.cwd(), filepath)}`);
        }
      } else {
        console.log(`⚪ Pas besoin: ${path.relative(process.cwd(), filepath)}`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors du traitement de ${filepath}:`, error.message);
    }
  });
  
  console.log(`\n📊 Résumé:`);
  console.log(`   • Fichiers analysés: ${totalFiles}`);
  console.log(`   • Fichiers modifiés: ${modifiedFiles}`);
  console.log(`   • Fichiers déjà configurés: ${totalFiles - modifiedFiles}`);
  
  if (modifiedFiles > 0) {
    console.log(`\n🎉 ${modifiedFiles} routes API ont été mises à jour avec 'export const runtime = "nodejs"'`);
  } else {
    console.log(`\n✨ Toutes les routes API sont déjà correctement configurées !`);
  }
}

main();
