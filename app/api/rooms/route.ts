// app/api/rooms/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { withAudit } from '@/lib/api/with-audit';

const ROOMS_FILE = path.join(process.cwd(), 'data', 'rooms.json')

// Fonction pour lire le fichier rooms.json
async function readRoomsFile() {
  try {
    const data = await fs.readFile(ROOMS_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    return parsed.rooms || []
  } catch (error) {
    console.error('Erreur lecture rooms.json:', error)
    return []
  }
}

// Fonction pour écrire dans le fichier rooms.json
async function writeRoomsFile(rooms: any[]) {
  try {
    const data = { rooms }
    await fs.writeFile(ROOMS_FILE, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error('Erreur écriture rooms.json:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeLocations = searchParams.get('includeLocations') === 'true'

    const rooms = await readRoomsFile()
    
    // Filtrer les salles actives
    const activeRooms = rooms.filter((room: any) => room.isActive !== false)
    
    // Trier par nom
    const sortedRooms = activeRooms.sort((a: any, b: any) => 
      (a.name || '').localeCompare(b.name || '')
    )

    return NextResponse.json({ rooms: sortedRooms })
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

    const rooms = await readRoomsFile()
    
    // Créer un nouvel ID
    const newId = `ROOM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Créer la nouvelle salle
    const newRoom = {
      id: newId,
      name: body.name,
      description: body.description || '',
      isActive: true,
      locations: body.locations || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    rooms.push(newRoom)
    
    const success = await writeRoomsFile(rooms)
    if (!success) {
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 })
    }
    
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
      description: response?.description
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

    const rooms = await readRoomsFile()
    const roomIndex = rooms.findIndex((room: any) => room.id === id)
    
    if (roomIndex === -1) {
      return NextResponse.json({ error: 'Salle non trouvée' }, { status: 404 })
    }
    
    // Mettre à jour la salle
    rooms[roomIndex] = {
      ...rooms[roomIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    }
    
    const success = await writeRoomsFile(rooms)
    if (!success) {
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 })
    }
    
    return NextResponse.json(rooms[roomIndex])
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

    const rooms = await readRoomsFile();
    const roomIndex = rooms.findIndex((room: any) => room.id === id);
    
    if (roomIndex === -1) {
      return NextResponse.json({ error: 'Salle non trouvée' }, { status: 404 });
    }
    
    // Stocker les infos avant suppression
    const deletedRoom = rooms[roomIndex];
    
    rooms.splice(roomIndex, 1);
    
    const success = await writeRoomsFile(rooms);
    if (!success) {
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 });
    }
    
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
      roomName: response?.deletedRoom?.name
    })
  }
);