// lib/class-data-utils.ts
// Utilitaires pour la gestion des class_data (objets uniquement)

import { createHash } from 'crypto';

interface ClassData {
  id: string;
  name: string;
  type: 'predefined' | 'custom' | 'auto';
}

// Fonction pour extraire le nom de la classe depuis class_data
export function getClassNameFromClassData(classData: ClassData | null | undefined): string {
  if (!classData) return '';
  return classData.name || '';
}

// Fonction pour parser le JSON class_data de manière sécurisée
export function parseClassDataSafe(classDataString: string | null | undefined): ClassData | null {
  try {
    if (!classDataString || classDataString === 'null' || classDataString === 'undefined') {
      return null;
    }
    
    // Si c'est déjà un objet (pas une chaîne), le retourner directement
    if (typeof classDataString === 'object') {
      return classDataString as ClassData;
    }
    
    const parsed = JSON.parse(classDataString) as ClassData;
    
    // Validation de la structure
    if (parsed && typeof parsed === 'object' && parsed.id && parsed.name && parsed.type) {
      return parsed;
    }
    
    return null;
  } catch (error) {
    console.warn('Erreur lors du parsing class_data JSON:', error, 'String:', classDataString);
    return null;
  }
}

// Fonction pour créer class_data depuis un objet classe existant
export function createClassDataFromClassObject(classObj: { id: string; name: string; type?: 'predefined' | 'custom' | 'auto' }): ClassData {
  return {
    id: classObj.id,
    name: classObj.name,
    type: classObj.type || 'custom'
  };
}

// Fonction pour créer class_data depuis un nom avec génération d'ID automatique
export function createClassDataFromString(className: string, classId?: string, type: 'predefined' | 'custom' | 'auto' = 'auto'): ClassData | null {
  // Cette fonction ne devrait plus être utilisée avec le nouveau système
  // Mais on la garde pour la compatibilité temporaire
  if (typeof className !== 'string') {
    console.warn('createClassDataFromString appelée avec un non-string:', typeof className, className);
    return null;
  }
  
  if (!className || className.trim() === '') {
    return null;
  }

  const name = className.trim();
  const id = classId || `auto-${createHash('md5').update(name).digest('hex')}`;
  
  return {
    id,
    name,
    type
  };
}

// Fonction pour normaliser les données de classe (objets uniquement)
export function normalizeClassField(classField: ClassData | ClassData[] | string | null | undefined): ClassData | null {
  // Si c'est une chaîne JSON, essayer de la parser d'abord
  if (typeof classField === 'string') {
    try {
      const parsed = JSON.parse(classField);
      classField = parsed;
    } catch (error) {
      console.warn('Erreur lors du parsing de classField JSON:', error, 'String:', classField);
      return null;
    }
  }
  
  // Si c'est un tableau, prendre le premier élément
  if (Array.isArray(classField) && classField.length > 0) {
    return classField[0];
  }
  
  // Si c'est un objet ClassData valide, le retourner
  if (classField && typeof classField === 'object' && 'id' in classField && 'name' in classField) {
    return classField as ClassData;
  }
  
  return null;
}

export type { ClassData };
