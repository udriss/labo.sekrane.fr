// app/api/notebook/route.ts

import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from 'fs'
import path from 'path'
import { withAudit } from '@/lib/api/with-audit';

const NOTEBOOK_FILE = path.join(process.cwd(), 'data', 'notebook.json')

// Fonction pour lire le fichier notebook.json
async function readNotebookFile() {
  try {
    const data = await fs.readFile(NOTEBOOK_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    return parsed.experiments || []
  } catch (error) {
    console.error('Erreur lecture notebook.json:', error)
    return []
  }
}

// Fonction pour écrire dans le fichier notebook.json
async function writeNotebookFile(experiments: any[]) {
  try {
    const data = { experiments }
    await fs.writeFile(NOTEBOOK_FILE, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error('Erreur écriture notebook.json:', error)
    return false
  }
}

export async function GET() {
  try {
    const notebooks = await readNotebookFile()
    // Trier par date de création décroissante
    const sortedNotebooks = notebooks.sort((a: any, b: any) => 
      new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
    )
    return NextResponse.json({ notebooks: sortedNotebooks })
  } catch (error) {
    console.error('Erreur API notebook GET:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des notebooks' }, { status: 500 })
  }
}

export const POST = withAudit(
  async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { 
      title, 
      description, 
      scheduledDate, 
      duration, 
      class: className, 
      groups, 
      createdById,
      objectives,
      procedure 
    } = body
    
    // Validation des données requises
    if (!title) {
      return NextResponse.json({ error: "Le titre est requis" }, { status: 400 })
    }
    
    // Gestion de la date (requise)
    let parsedDate = new Date()
    if (scheduledDate) {
      const tempDate = new Date(scheduledDate)
      if (!isNaN(tempDate.getTime())) {
        parsedDate = tempDate
      }
    }

    // Lire les notebooks existants
    const notebooks = await readNotebookFile()
    
    // Créer un nouvel ID
    const newId = `NOTEBOOK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Créer le nouveau notebook
    const newNotebook = {
      id: newId,
      title,
      description: description || "",
      scheduledDate: parsedDate.toISOString(),
      duration: duration || null,
      class: className || "",
      groups: groups || [],
      createdById: createdById || "",
      objectives: objectives || null,
      procedure: procedure || null,
      status: 'PLANNED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Simuler les relations utilisateur (à adapter selon vos besoins)
      createdBy: { name: 'Utilisateur', email: 'user@example.com' }
    }
    
    // Ajouter le nouveau notebook
    notebooks.push(newNotebook)
    
    // Sauvegarder
    const success = await writeNotebookFile(notebooks)
    if (!success) {
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 })
    }
    
    return NextResponse.json(newNotebook, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du TP:', error)
    return NextResponse.json({ error: "Erreur lors de la création du TP" }, { status: 500 })
  }
},
  {
    module: 'SYSTEM',
    entity: 'notebook',
    action: 'CREATE',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      notebookTitle: response?.title,
      class: response?.class,
      scheduledDate: response?.scheduledDate
    })
  }
)
