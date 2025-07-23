// This file is intended for server-side use only. If used in a client-side context, fetch data via an API route instead.
import path from 'path';
import { ChemicalCompound } from '@/types/prisma';

// Fonction pour récupérer les produits chimiques depuis l'API
export async function fetchChemicalsFromAPI(query: string): Promise<ChemicalCompound[]> {
  try {
    const response = await fetch(`/api/preset-chemicals?query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des données depuis l\'API');
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des données depuis l\'API:', error);
    return [];
  }
}

// Fonction de recherche pour l'auto-complétion
export async function searchChemicals(query: string): Promise<ChemicalCompound[]> {
  return await fetchChemicalsFromAPI(query);
}

// Note: Client-side components should fetch data from an API route instead of directly using this file.
