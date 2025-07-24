// import fetch from 'node-fetch';

const testData = {
  actionType: "API_ACCESS",
  module: "CHEMICALS",
  user: {
    id: "system",
    email: "system@labo.fr",
    name: "System",
    role: "SYSTEM"
  },
  request: {
    method: "GET",
    path: "/api/chemicals/",
    ip: "127.0.0.1",
    userAgent: "test-script"
  },
  details: {
    endpoint: "/api/chemicals/",
    source: "test_script"
  }
};

console.log('Sending test data:', JSON.stringify(testData, null, 2));

fetch('http://localhost:3000/api/audit/log', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log('Response status:', response.status);
  return response.text();
})
.then(data => {
  console.log('Response body:', data);
})
.catch(error => {
  console.error('Error:', error);
});
