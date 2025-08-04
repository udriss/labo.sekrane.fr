import mysql from 'mysql2/promise';

async function createRoomsTables() {
  let connection;
  
  try {
    // Créer la connexion
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'int',
      password: process.env.DB_PASSWORD || '4Na9Gm8mdTVgnUp',
      database: process.env.DB_NAME || 'labo'
    });
    
    console.log('Connexion à la base de données établie');
    
    // Créer la table rooms
    const createRoomsTable = `
      CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50),
        capacity INT,
        equipment JSON,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createRoomsTable);
    console.log('Table rooms créée avec succès');
    
    // Créer la table room_locations
    const createRoomLocationsTable = `
      CREATE TABLE IF NOT EXISTS room_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50),
        position JSON,
        capacity INT,
        available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createRoomLocationsTable);
    console.log('Table room_locations créée avec succès');
    
    // Vérifier si les données existent déjà
    const [existingRooms] = await connection.execute('SELECT COUNT(*) as count FROM rooms');
    
    if (existingRooms[0].count === 0) {
      // Insérer des données de test
      const insertRooms = `
        INSERT INTO rooms (name, type, capacity, equipment, description) VALUES
        ('Labo Chimie A', 'chimie', 24, '["microscopes", "balances", "hotte"]', 'Laboratoire principal de chimie'),
        ('Labo Chimie B', 'chimie', 20, '["balances", "hotte", "réfrigérateur"]', 'Laboratoire secondaire de chimie'),
        ('Labo Physique', 'physique', 30, '["oscilloscopes", "générateurs", "multimètres"]', 'Laboratoire de physique'),
        ('Amphithéâtre', 'cours', 100, '["projecteur", "tableau", "sonorisation"]', 'Amphithéâtre pour les cours magistraux')
      `;
      
      await connection.execute(insertRooms);
      console.log('Données de test rooms insérées');
      
      const insertLocations = `
        INSERT INTO room_locations (room_id, name, type, position, capacity, available) VALUES
        (1, 'Paillasse 1', 'paillasse', '{"x": 10, "y": 20}', 4, TRUE),
        (1, 'Paillasse 2', 'paillasse', '{"x": 10, "y": 40}', 4, TRUE),
        (1, 'Hotte 1', 'hotte', '{"x": 60, "y": 20}', 2, TRUE),
        (2, 'Paillasse 1', 'paillasse', '{"x": 10, "y": 20}', 4, TRUE),
        (2, 'Hotte 1', 'hotte', '{"x": 60, "y": 20}', 2, TRUE),
        (3, 'Table 1', 'table', '{"x": 10, "y": 20}', 6, TRUE),
        (3, 'Table 2', 'table', '{"x": 30, "y": 20}', 6, TRUE),
        (3, 'Table 3', 'table', '{"x": 50, "y": 20}', 6, TRUE),
        (4, 'Estrade', 'bureau', '{"x": 50, "y": 10}', 1, TRUE)
      `;
      
      await connection.execute(insertLocations);
      console.log('Données de test room_locations insérées');
    } else {
      console.log('Les données existent déjà, pas d\'insertion');
    }
    
    console.log('Création des tables terminée avec succès');
    
  } catch (error) {
    console.error('Erreur lors de la création des tables:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connexion fermée');
    }
  }
}

// Exécuter la fonction
createRoomsTables().catch(console.error);
