// Test script to check created_by field issue
const fetch = require('node-fetch');

async function testCreateEvent() {
  const eventData = {
    title: "Test Event Debug",
    description: "Test event to debug created_by issue",
    type: "TP",
    room: "Salle 1",
    selectedClass: "Test Class",
    timeSlots: [{
      date: "2024-01-15",
      startTime: "10:00",
      endTime: "12:00"
    }],
    materials: [],
    chemicals: []
  };

  try {
    const response = await fetch('http://localhost:3000/api/calendrier/chimie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Simulate auth session - this would normally be handled by NextAuth
        'Cookie': 'test-session=true' 
      },
      body: JSON.stringify(eventData)
    });

    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testCreateEvent();
