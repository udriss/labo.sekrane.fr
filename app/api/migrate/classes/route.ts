// app/api/migrate/classes/route.ts
// ENDPOINT TEMPORAIRE - À SUPPRIMER APRÈS MIGRATION

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { ClassServiceSQL } from '@/lib/services/classService.sql';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Début de la migration des classes...');
    
    // Lire le fichier JSON
    const classesFile = path.join(process.cwd(), 'data', 'classes.json');
    const jsonData = JSON.parse(await fs.readFile(classesFile, 'utf-8'));
    
    console.log(`📊 Classes prédéfinies trouvées: ${jsonData.predefinedClasses?.length || 0}`);
    console.log(`📊 Classes personnalisées trouvées: ${jsonData.customClasses?.length || 0}`);
    
    // Migrer vers SQL
    await ClassServiceSQL.migrateFromJSON(jsonData);
    
    // Créer une sauvegarde du fichier JSON
    const backupFile = `${classesFile}.backup.${Date.now()}`;
    await fs.copyFile(classesFile, backupFile);
    
    console.log('✅ Migration terminée avec succès!');
    
    return NextResponse.json({
      success: true,
      message: 'Migration des classes terminée avec succès',
      migrated: {
        predefined: jsonData.predefinedClasses?.length || 0,
        custom: jsonData.customClasses?.length || 0
      },
      backup: backupFile
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la migration des classes',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

// Endpoint pour vérifier les données migrées
export async function GET(request: NextRequest) {
  try {
    const sqlClasses = await ClassServiceSQL.getAllClasses();
    
    return NextResponse.json({
      success: true,
      data: sqlClasses,
      counts: {
        predefined: sqlClasses.predefinedClasses.length,
        custom: sqlClasses.customClasses.length,
        total: sqlClasses.predefinedClasses.length + sqlClasses.customClasses.length
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la vérification des classes'
    }, { status: 500 });
  }
}
