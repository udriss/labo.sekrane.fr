// Script de test pour vérifier la correction des données de classe
const { normalizeClassField, getClassNameFromClassData } = require('./lib/class-data-utils.ts')

// Test avec la chaîne JSON problématique
const classDataString = '[{"id":"CLASS_CUSTOM_1754078130215_1","name":"MaClasse2","type":"custom"}]'

console.log('=== Test de normalizeClassField ===')
console.log('Input:', classDataString)

try {
  const normalized = normalizeClassField(classDataString)
  console.log('Normalized:', normalized)
  
  const className = getClassNameFromClassData(normalized)
  console.log('Class name:', className)
  
  if (className === 'MaClasse2') {
    console.log('✅ Test réussi! Le nom de classe est correctement extrait.')
  } else {
    console.log('❌ Test échoué! Le nom de classe attendu est "MaClasse2" mais on a reçu:', className)
  }
} catch (error) {
  console.error('❌ Erreur lors du test:', error)
}

// Test avec un objet déjà parsé
console.log('\n=== Test avec objet déjà parsé ===')
const classDataObject = [{"id":"CLASS_CUSTOM_1754078130215_1","name":"MaClasse2","type":"custom"}]
const normalized2 = normalizeClassField(classDataObject)
console.log('Normalized object:', normalized2)
console.log('Class name from object:', getClassNameFromClassData(normalized2))

// Test avec null/undefined
console.log('\n=== Test avec null/undefined ===')
console.log('null:', normalizeClassField(null))
console.log('undefined:', normalizeClassField(undefined))
console.log('empty string:', normalizeClassField(''))
