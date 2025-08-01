// app/api/physique/composants/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server"
import { withConnection } from '@/lib/db';

// GET - Récupérer les composants de physique
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const type = searchParams.get('type')

    return withConnection(async (connection) => {
      // Pour la physique, nous pouvons utiliser une table dédiée aux composants 
      // ou créer des "composants" basiques pour les TP de physique
      let query = `
        SELECT 
          id,
          name,
          'composant' as unit,
          1 as quantity,
          description,
          type,
          created_at,
          updated_at
        FROM physics_components
        WHERE 1=1
      `;
      
      const queryParams: any[] = [];

      if (search) {
        query += ` AND (name LIKE ? OR description LIKE ?)`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern);
      }

      if (type) {
        query += ` AND type = ?`;
        queryParams.push(type);
      }

      query += ` ORDER BY name ASC`;

      try {
        const [rows] = await connection.execute(query, queryParams);
        
        // Transformer les données pour correspondre au format attendu
        const components = (rows as any[]).map(row => ({
          id: row.id,
          name: row.name,
          quantity: row.quantity || 1,
          unit: row.unit || 'unité',
          description: row.description,
          type: row.type,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));

        return NextResponse.json(components);
      } catch (dbError: any) {
        // Si la table n'existe pas, retourner des composants de base
        if (dbError.code === 'ER_NO_SUCH_TABLE') {
          console.log('📋 Table physics_components non trouvée, retour de composants de base');
          
          const basicComponents = [
            { id: 'COMP_001', name: 'Résistance 100Ω', quantity: 1, unit: 'unité', type: 'électronique' },
            { id: 'COMP_002', name: 'Résistance 220Ω', quantity: 1, unit: 'unité', type: 'électronique' },
            { id: 'COMP_003', name: 'Résistance 1kΩ', quantity: 1, unit: 'unité', type: 'électronique' },
            { id: 'COMP_004', name: 'Condensateur 100µF', quantity: 1, unit: 'unité', type: 'électronique' },
            { id: 'COMP_005', name: 'LED Rouge', quantity: 1, unit: 'unité', type: 'électronique' },
            { id: 'COMP_006', name: 'LED Verte', quantity: 1, unit: 'unité', type: 'électronique' },
            { id: 'COMP_007', name: 'Fils de connexion', quantity: 1, unit: 'lot', type: 'connectique' },
            { id: 'COMP_008', name: 'Breadboard', quantity: 1, unit: 'unité', type: 'support' },
            { id: 'COMP_009', name: 'Pile 9V', quantity: 1, unit: 'unité', type: 'alimentation' },
            { id: 'COMP_010', name: 'Multimètre', quantity: 1, unit: 'unité', type: 'mesure' }
          ];

          // Filtrer selon les critères de recherche
          let filteredComponents = basicComponents;
          
          if (search) {
            const searchLower = search.toLowerCase();
            filteredComponents = basicComponents.filter(comp => 
              comp.name.toLowerCase().includes(searchLower)
            );
          }

          if (type) {
            filteredComponents = filteredComponents.filter(comp => comp.type === type);
          }

          return NextResponse.json(filteredComponents);
        } else {
          throw dbError;
        }
      }
    });
  } catch (error) {
    console.error('🔧 [GET] /api/physique/composants - Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des composants de physique' },
      { status: 500 }
    );
  }
}
