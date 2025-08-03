import fetch from 'node-fetch';

async function testMoveEvent() {
  try {
    console.log('Testing move-event API...');
    
    const response = await fetch('http://localhost:3000/api/calendrier/chimie/move-event/', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: '7057e857-16ea-4176-bac0-8542e2364665',
        newDate: '2025-08-04',
        newTime: '10:00'
      })
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', result);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testMoveEvent();
