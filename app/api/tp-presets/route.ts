// app/api/tp-presets/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { withAudit } from '@/lib/api/with-audit';

const TP_PRESETS_FILE = path.join(process.cwd(), 'data', 'tp-presets.json')

// Fonction pour lire le fichier tp-presets.json
async function readTpPresetsFile() {
  try {
    const data = await fs.readFile(TP_PRESETS_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    return parsed.presets || []
  } catch (error) {
    console.error('Erreur lecture tp-presets.json:', error)
    return []
  }
}

// Fonction pour écrire dans le fichier tp-presets.json
async function writeTpPresetsFile(presets: any[]) {
  try {
    const data = { presets }
    await fs.writeFile(TP_PRESETS_FILE, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error('Erreur écriture tp-presets.json:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const level = searchParams.get('level')
    const subject = searchParams.get('subject')

    let tpPresets = await readTpPresetsFile()

    // Filtrer les presets actifs
    tpPresets = tpPresets.filter((preset: any) => preset.isActive !== false)

    // Appliquer les filtres
    if (search) {
      const searchLower = search.toLowerCase()
      tpPresets = tpPresets.filter((preset: any) =>
        (preset.title || '').toLowerCase().includes(searchLower) ||
        (preset.description || '').toLowerCase().includes(searchLower) ||
        (preset.objectives || '').toLowerCase().includes(searchLower)
      )
    }

    if (level) {
      tpPresets = tpPresets.filter((preset: any) => preset.level === level)
    }

    if (subject) {
      tpPresets = tpPresets.filter((preset: any) => preset.subject === subject)
    }

    // Trier par date de création décroissante
    tpPresets.sort((a: any, b: any) => 
      new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    )

    return NextResponse.json({ 
      presets: tpPresets,
      total: tpPresets.length
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des TP presets:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des TP presets' },
      { status: 500 }
    )
  }
}

export const POST = withAudit(
  async (request: NextRequest) => {
  try {
    const body = await request.json()
    
    if (!body.title || !body.createdById) {
      return NextResponse.json({ 
        error: 'Le titre et le créateur sont requis' 
      }, { status: 400 })
    }

    const presets = await readTpPresetsFile()
    
    // Créer un nouvel ID
    const newId = `TP_PRESET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Créer le nouveau preset
    const newPreset = {
      id: newId,
      title: body.title,
      description: body.description || '',
      objectives: body.objectives || '',
      procedure: body.procedure || '',
      duration: body.duration ? parseInt(body.duration) : null,
      level: body.level || '',
      subject: body.subject || '',
      createdById: body.createdById,
      attachments: body.attachments || [],
      chemicals: body.chemicals || [],
      materials: body.materials || [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Simuler les relations
      createdBy: { id: body.createdById, name: 'Utilisateur' }
    }
    
    presets.push(newPreset)
    
    const success = await writeTpPresetsFile(presets)
    if (!success) {
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 })
    }
    
    return NextResponse.json(newPreset, { status: 201 })
  } catch (error) {
    console.error('Erreur création TP preset:', error)
    return NextResponse.json({ error: 'Erreur création' }, { status: 500 })
  }
},
  {
    module: 'SYSTEM',
    entity: 'tp-preset',
    action: 'CREATE',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      presetTitle: response?.title,
      level: response?.level,
      subject: response?.subject,
      createdBy: response?.createdById
    })
  }
)

export const PUT = withAudit(
  async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'ID requis pour la mise à jour' }, { status: 400 })
    }

    const presets = await readTpPresetsFile()
    const presetIndex = presets.findIndex((preset: any) => preset.id === id)
    
    if (presetIndex === -1) {
      return NextResponse.json({ error: 'TP preset non trouvé' }, { status: 404 })
    }
    
    // Mettre à jour le preset
    presets[presetIndex] = {
      ...presets[presetIndex],
      ...updateData,
      duration: updateData.duration ? parseInt(updateData.duration) : null,
      attachments: updateData.attachments || [],
      chemicals: updateData.chemicals || [],
      materials: updateData.materials || [],
      updatedAt: new Date().toISOString()
    }
    
    const success = await writeTpPresetsFile(presets)
    if (!success) {
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 })
    }
    
    return NextResponse.json(presets[presetIndex])
  } catch (error) {
    console.error('Erreur mise à jour TP preset:', error)
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
},
  {
    module: 'SYSTEM',
    entity: 'tp-preset',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      presetTitle: response?.title,
      fieldsUpdated: Object.keys(response || {}).filter(key => !['id', 'createdAt', 'updatedAt'].includes(key))
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

    const presets = await readTpPresetsFile();
    const presetIndex = presets.findIndex((preset: any) => preset.id === id);
    
    if (presetIndex === -1) {
      return NextResponse.json({ error: 'TP preset non trouvé' }, { status: 404 });
    }
    
    // Stocker les infos avant suppression
    const deletedPreset = presets[presetIndex];
    
    presets.splice(presetIndex, 1);
    
    const success = await writeTpPresetsFile(presets);
    if (!success) {
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'TP preset supprimé avec succès',
      deletedPreset: { id: deletedPreset.id, title: deletedPreset.title }
    });
  },
  {
    module: 'SYSTEM',
    entity: 'tp-preset',
    action: 'DELETE',
    extractEntityIdFromResponse: (response) => response?.deletedPreset?.id,
    customDetails: (req, response) => ({
      presetTitle: response?.deletedPreset?.title
    })
  }
)
