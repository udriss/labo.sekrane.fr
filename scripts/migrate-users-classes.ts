// scripts/migrate-users-classes.ts
import fs from 'fs/promises';
import path from 'path';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

// Classes prédéfinies
const PREDEFINED_CLASSES = [
  "1ère ES",
  "Terminale ES",
  "1ère STI2D",
  "Terminale STI2D",
  "201",
  "202",
  "203",
  "204",
  "205",
  "206",
  "207",
];

async function migrateUsers() {
  try {
    // Lire le fichier actuel
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    const users = parsed.users || [];

    // Transformer chaque utilisateur
    const updatedUsers = users.map((user: any) => {
      const updatedUser = { ...user };
      
      // Initialiser les tableaux
      updatedUser.associatedClasses = [];
      updatedUser.customClasses = [];

      // Si l'utilisateur a une classe principale, l'ajouter aux classes associées
      if (user.class) {
        updatedUser.associatedClasses.push(user.class);
        delete updatedUser.class; // Supprimer l'ancienne propriété
      }

      // Traiter les customClasses existantes
      if (user.customClasses && Array.isArray(user.customClasses)) {
        user.customClasses.forEach((classObj: any) => {
          const className = classObj.className;
          
          // Si c'est une classe prédéfinie, l'ajouter aux associatedClasses
          if (PREDEFINED_CLASSES.includes(className)) {
            if (!updatedUser.associatedClasses.includes(className)) {
              updatedUser.associatedClasses.push(className);
            }
          } else {
            // Sinon, l'ajouter aux customClasses
            if (!updatedUser.customClasses.includes(className)) {
              updatedUser.customClasses.push(className);
            }
          }
        });
      }

      // Supprimer l'ancien format customClasses avec objets
      delete updatedUser.customClasses;
      
      return updatedUser;
    });

    // Sauvegarder le fichier mis à jour
    await fs.writeFile(
      USERS_FILE, 
      JSON.stringify({ users: updatedUsers }, null, 2),
      'utf-8'
    );

    console.log('Migration terminée avec succès !');
    console.log(`${updatedUsers.length} utilisateurs mis à jour.`);

  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  }
}

// Exécuter la migration
migrateUsers();