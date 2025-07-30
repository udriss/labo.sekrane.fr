// app/api/salles/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { withAudit } from '@/lib/api/with-audit';

const ROOMS_FILE = path.join(process.cwd(), 'data', 'rooms.json')

// Fonction pour lire le fichier des salles
async function readRooms() {
  try {
    const data = await fs.readFile(ROOMS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Erreur lecture fichier salles:', error)
    return { rooms: [] }
  }
}

// Fonction pour écrire le fichier des salles
async function writeRooms(data: any) {
  try {
    await fs.writeFile(ROOMS_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Erreur écriture fichier salles:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeLocations = searchParams.get('includeLocations') === 'true'

    const data = await readRooms()
    let rooms = data.rooms.filter((room: any) => room.isActive !== false)

    if (!includeLocations) {
      rooms = rooms.map((room: any) => {
        const { locations, ...roomWithoutLocations } = room
        return roomWithoutLocations
      })
    } else {
      rooms = rooms.map((room: any) => ({
        ...room,
        locations: (room.locations || []).filter((loc: any) => loc.isActive !== false)
      }))
    }

    // Trier par nom
    rooms.sort((a: any, b: any) => a.name.localeCompare(b.name))

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error('Erreur lors de la récupération des salles:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des salles' },
      { status: 500 }
    )
  }
}

export const POST = withAudit(
  async (request: NextRequest) => {
  try {
    const body = await request.json()
    
    if (!body.name) {
      return NextResponse.json({ error: 'Le nom de la salle est requis' }, { status: 400 })
    }

    const data = await readRooms()
    
    const newRoom = {
      id: `ROOM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      description: body.description || null,
      isActive: true,
      capacity: body.capacity || null,
      locations: (body.locations || []).map((loc: any) => ({
        id: `LOC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: loc.name,
        description: loc.description || null,
        isActive: true
      }))
    }

    data.rooms.push(newRoom)
    await writeRooms(data)
    
    return NextResponse.json(newRoom, { status: 201 })
  } catch (error) {
    console.error('Erreur création salle:', error)
    return NextResponse.json({ error: 'Erreur création' }, { status: 500 })
  }
},
  {
    module: 'ROOMS',
    entity: 'room',
    action: 'CREATE',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      roomName: response?.name,
      capacity: response?.capacity,
      locationsCount: response?.locations?.length || 0
    })
  }
);


export const PUT = withAudit(
  async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'ID requis pour la mise à jour' }, { status: 400 })
    }

    const data = await readRooms()
    const roomIndex = data.rooms.findIndex((room: any) => room.id === id)
    
    if (roomIndex === -1) {
      return NextResponse.json({ error: 'Salle non trouvée' }, { status: 404 })
    }

    // Mettre à jour la salle
    data.rooms[roomIndex] = {
      ...data.rooms[roomIndex],
      ...updateData,
      id // Garder l'ID original
    }

    await writeRooms(data)
    
    return NextResponse.json(data.rooms[roomIndex])
  } catch (error) {
    console.error('Erreur mise à jour salle:', error)
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
},
  {
    module: 'ROOMS',
    entity: 'room',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      roomName: response?.name
    })
  }
);


export const DELETE = withAudit(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID requis pour la suppression' }, { status: 400 });
    }

    const data = await readRooms();
    const roomIndex = data.rooms.findIndex((room: any) => room.id === id);
    
    if (roomIndex === -1) {
      return NextResponse.json({ error: 'Salle non trouvée' }, { status: 404 });
    }

    // Stocker les infos avant modification
    const deletedRoom = data.rooms[roomIndex];
    
    // Marquer comme inactif plutôt que supprimer
    data.rooms[roomIndex].isActive = false;
    
    await writeRooms(data);
    
    return NextResponse.json({ 
      message: 'Salle supprimée avec succès',
      deletedRoom: { id: deletedRoom.id, name: deletedRoom.name }
    });
  },
  {
    module: 'ROOMS',
    entity: 'room',
    action: 'DELETE',
    extractEntityIdFromResponse: (response) => response?.deletedRoom?.id,
    customDetails: (req, response) => ({
      roomName: response?.deletedRoom?.name,
      softDelete: true
    })
  }
)
