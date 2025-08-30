import { NextResponse } from 'next/server';
import { loadAppSettings } from '@/lib/services/app-settings';

export async function GET() {
  try {
    
    const settings = await loadAppSettings();


    // Retourner seulement les champs nécessaires côté client
    const response = {
      NOM_ETABLISSEMENT: settings.NOM_ETABLISSEMENT,
      brandingName: settings.brandingName,
    };
    
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[app-settings] Erreur lors de la récupération des paramètres:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paramètres' },
      { status: 500 }
    );
  }
}
