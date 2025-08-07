// Test de l'API timeslots pour débugger
// Fichier : test-timeslots-api.js

console.log('🔍 Test de l\'API /api/timeslots')

// Test avec des paramètres d'exemple
const testApiTimeslots = async () => {
  try {
    // Remplacez ces valeurs par un vrai event_id de votre base de données
    const testEventId = 'test-event-id' 
    const testDiscipline = 'chimie'
    const testType = 'active'
    
    const url = `/api/timeslots?event_id=${testEventId}&discipline=${testDiscipline}&type=${testType}`
    
    console.log('📡 Requête:', url)
    
    const response = await fetch(url)
    const data = await response.json()
    
    console.log('📊 Réponse status:', response.status)
    console.log('📊 Réponse headers:', Object.fromEntries(response.headers.entries()))
    console.log('📊 Réponse data:', data)
    
    if (!response.ok) {
      console.error('❌ Erreur API:', data)
    } else {
      console.log('✅ API fonctionnelle, timeslots:', data.timeslots?.length || 0)
    }
    
  } catch (error) {
    console.error('❌ Erreur réseau:', error)
  }
}

// Pour exécuter dans la console du navigateur :
// testApiTimeslots()

// Vous pouvez aussi tester en copiant cette URL dans le navigateur :
// http://localhost:3000/api/timeslots?event_id=YOUR_EVENT_ID&discipline=chimie&type=active
