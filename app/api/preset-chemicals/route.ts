import { NextResponse, NextRequest } from "next/server";
import fs from 'fs/promises';
import path from 'path';

// Chemin vers le fichier JSON des produits chimiques communs
const COMMON_CHEMICALS_FILE = path.join(process.cwd(), 'data', 'common-chemicals.json');

export async function GET(request: NextRequest) {
  try {
    // Lire les données depuis le fichier JSON
    const data = await fs.readFile(COMMON_CHEMICALS_FILE, 'utf-8');
    const chemicals = JSON.parse(data).chemicals;

    // Récupérer la query et le type de recherche (name ou cas)
    const query = request.nextUrl.searchParams.get('query')?.trim().toLowerCase() || '';
    const type = request.nextUrl.searchParams.get('type')?.trim().toLowerCase() || 'name';

    // Fonction de tri avancé pour le nom
    function sortChemicalsByName(chemList: any[], query: string) {
      if (!query) return chemList;
      return chemList.slice().sort((a: any, b: any) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();

        // 1. Commence exactement par la query
        const aStarts = nameA.startsWith(query);
        const bStarts = nameB.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        if (aStarts && bStarts) return nameA.localeCompare(nameB);

        // 2. Contient la query en début de mot (après espace, tiret, parenthèse, etc.)
        const wordBoundary = /[\s\-\(\[]/;
        const aWord = nameA.split(wordBoundary).some((w: string) => w.startsWith(query));
        const bWord = nameB.split(wordBoundary).some((w: string) => w.startsWith(query));
        if (aWord && !bWord) return -1;
        if (!aWord && bWord) return 1;
        if (aWord && bWord) return nameA.localeCompare(nameB);

        // 3. Contient la query ailleurs
        const aIdx = nameA.indexOf(query);
        const bIdx = nameB.indexOf(query);
        if (aIdx !== -1 && bIdx === -1) return -1;
        if (aIdx === -1 && bIdx !== -1) return 1;
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx || nameA.localeCompare(nameB);

        // Sinon, tri alphabétique
        return nameA.localeCompare(nameB);
      });
    }

    // Fonction de tri avancé pour le numéro CAS
    function sortChemicalsByCas(chemList: any[], query: string) {
      if (!query) return chemList;
      return chemList.slice().sort((a: any, b: any) => {
        const casA = (a.casNumber || '').toLowerCase();
        const casB = (b.casNumber || '').toLowerCase();
        // 1. Commence exactement par la query
        const aStarts = casA.startsWith(query);
        const bStarts = casB.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        if (aStarts && bStarts) return casA.localeCompare(casB);
        // 2. Contient la query ailleurs
        const aIdx = casA.indexOf(query);
        const bIdx = casB.indexOf(query);
        if (aIdx !== -1 && bIdx === -1) return -1;
        if (aIdx === -1 && bIdx !== -1) return 1;
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx || casA.localeCompare(casB);
        // Sinon, tri alphabétique
        return casA.localeCompare(casB);
      });
    }

    if (query) {
      let filtered: any[] = [];
      let sorted: any[] = [];
      if (type === 'cas') {
        filtered = chemicals.filter((chem: any) => (chem.casNumber || '').toLowerCase().includes(query));
        sorted = sortChemicalsByCas(filtered, query);
      } else if (type === 'name' || !type) {
        filtered = chemicals.filter((chem: any) => chem.name.toLowerCase().includes(query));
        sorted = sortChemicalsByName(filtered, query);
      } else {
        // Si un type inconnu est passé, retourner vide ou erreur (ici: vide)
        return NextResponse.json([]);
      }
      // Regrouper les résultats triés par catégorie
      const grouped = sorted.reduce((acc: { name: string; presetChemicals: any[] }[], chemical: any) => {
        let category = acc.find((cat: { name: string }) => cat.name === chemical.category);
        if (!category) {
          category = { name: chemical.category, presetChemicals: [] };
          acc.push(category);
        }
        category.presetChemicals.push(chemical);
        return acc;
      }, []);
      return NextResponse.json(grouped);
    }

    // Par défaut (pas de recherche), on regroupe par catégorie
    const categories = chemicals.reduce((acc: { name: string; presetChemicals: any[] }[], chemical: any) => {
      let category = acc.find((cat: { name: string }) => cat.name === chemical.category);
      if (!category) {
        category = { name: chemical.category, presetChemicals: [] };
        acc.push(category);
      }
      category.presetChemicals.push(chemical);
      return acc;
    }, []);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Erreur lors de la récupération des molécules prédéfinies:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des molécules prédéfinies" },
      { status: 500 }
    );
  }
}
