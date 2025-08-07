// Test de l'API timeslots avec authentification basique
import fetch from 'node-fetch'

async function testTimeslotsApi() {
  try {
    // Pour le moment, on va juste tester sans authentification
    // L'API devrait au moins loguer l'erreur d'authentification
    
    const eventId = '9d789f14-958f-44da-9700-a60f7fb1b3d5'
    const discipline = 'chimie'
    const type = 'active'
    
    const url = `http://localhost:3000/api/timeslots?event_id=${eventId}&discipline=${discipline}&type=${type}`
    
    
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Pas d'authentification pour voir l'erreur d'auth en premier
      }
    })
    
    
    
    
    const data = await response.text() // Utiliser text() d'abord pour voir la réponse brute
    
    
    try {
      const jsonData = JSON.parse(data)
      
    } catch (e) {
      
    }
    
  } catch (error) {
    console.error('❌ Erreur réseau:', error.message)
  }
}

testTimeslotsApi()
