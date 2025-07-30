#!/usr/bin/env node

const bcrypt = require('bcryptjs');

async function testPassword() {
  const plainPassword = 'password123';
  const storedHash = '$2b$12$OENV7sVwsCpxoBWcCp/Th.JuvdVsdo2XTrXHg9XeL8b9rugFhus32';
  
  console.log('Test de vérification du mot de passe:');
  console.log('Mot de passe clair:', plainPassword);
  console.log('Hash stocké:', storedHash);
  
  try {
    const isValid = await bcrypt.compare(plainPassword, storedHash);
    console.log('Résultat de bcrypt.compare():', isValid);
    
    // Test avec différentes variantes
    const testCases = [
      'password123',
      'Password123',
      'password',
      'admin123'
    ];
    
    console.log('\nTest avec différents mots de passe:');
    for (const testPassword of testCases) {
      const result = await bcrypt.compare(testPassword, storedHash);
      console.log(`"${testPassword}" -> ${result}`);
    }
    
    // Générer un nouveau hash pour comparaison
    const newHash = await bcrypt.hash(plainPassword, 12);
    console.log('\nNouveau hash généré:', newHash);
    const newHashTest = await bcrypt.compare(plainPassword, newHash);
    console.log('Test avec nouveau hash:', newHashTest);
    
  } catch (error) {
    console.error('Erreur lors du test:', error);
  }
}

testPassword();
