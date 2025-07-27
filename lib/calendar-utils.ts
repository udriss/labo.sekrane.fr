// lib/calendar-utils.ts

import { promises as fs } from 'fs'
import path from 'path'


const CALENDAR_FILE = path.join(process.cwd(), 'data', 'calendar.json')

// Fonction pour écrire dans le fichier calendrier
export async function writeCalendarFile(data: any) {
  try {
    await fs.writeFile(CALENDAR_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Erreur écriture fichier calendar:', error)
    throw error
  }
}


// Fonction pour lire le fichier calendrier
export async function readCalendarFile() {
  try {
    const data = await fs.readFile(CALENDAR_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Erreur lecture fichier calendar:', error)
    return { events: [] }
  }
}