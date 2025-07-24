// Test simple pour vérifier l'audit middleware
async function testAuditMiddleware() {
  try {
    console.log('Test audit middleware...');
    
    const response = await fetch('/api/chemicals/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response OK:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Data received, chemicals count:', data.chemicals?.length || 0);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Exécuter le test
testAuditMiddleware();
