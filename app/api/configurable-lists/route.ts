import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ error: 'Type parameter is required' }, { status: 400 });
    }

    const items = await prisma.configurableList.findMany({
      where: {
        type,
        isActive: true
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Erreur lors de la récupération des éléments configurables:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, value } = await request.json();

    if (!type || !value) {
      return NextResponse.json({ error: 'Type et value sont requis' }, { status: 400 });
    }

    // Vérifier si l'élément existe déjà
    const existing = await prisma.configurableList.findUnique({
      where: {
        type_value: {
          type,
          value
        }
      }
    });

    if (existing) {
      // Réactiver s'il était désactivé
      if (!existing.isActive) {
        const updated = await prisma.configurableList.update({
          where: { id: existing.id },
          data: { isActive: true }
        });
        return NextResponse.json({ item: updated });
      }
      return NextResponse.json({ item: existing });
    }

    // Créer un nouvel élément
    const item = await prisma.configurableList.create({
      data: {
        type,
        value,
        sortOrder: 0
      }
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Erreur lors de la création de l\'élément configurable:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
