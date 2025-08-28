import { NextResponse } from 'next/server';
import { loadAppSettings } from '@/lib/services/app-settings';

export async function GET() {
  try {
    console.log('[app-settings] Début de la requête');
    const settings = await loadAppSettings();
    console.log('[app-settings] Settings chargés:', { 
      NOM_ETABLISSEMENT: settings.NOM_ETABLISSEMENT, 
      brandingName: settings.brandingName 
    });

    // Retourner seulement les champs nécessaires côté client
    const response = {
      NOM_ETABLISSEMENT: settings.NOM_ETABLISSEMENT,
      brandingName: settings.brandingName,
    };
    
    console.log('[app-settings] Response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('[app-settings] Erreur lors de la récupération des paramètres:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paramètres' },
      { status: 500 }
    );
  }
}
