// scripts/migrate-calendar-modified-by.ts

import { promises as fs } from 'fs'
import path from 'path'

const CALENDAR_FILE = path.join(process.cwd(), 'data', 'calendar.json')

async function migrateCalendarData() {
  try {
    // Lire le fichier
    const data = await fs.readFile(CALENDAR_FILE, 'utf-8')
    const calendarData = JSON.parse(data)
    
    // Ajouter modifiedBy à tous les événements existants
    calendarData.events = calendarData.events.map((event: any) => ({
      ...event,
      modifiedBy: event.modifiedBy || []
    }))
    
    // Sauvegarder le fichier
    await fs.writeFile(CALENDAR_FILE, JSON.stringify(calendarData, null, 2))
    
    console.log('Migration terminée avec succès')
  } catch (error) {
    console.error('Erreur lors de la migration:', error)
  }
}

migrateCalendarData()