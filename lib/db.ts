// lib/db.ts

import mysql from 'mysql2/promise';
import { Pool, PoolConnection, PoolOptions } from 'mysql2/promise';
import { updateFragmentsTable } from './migrations/updateFragmentsTable';


// Charger les variables d'environnement
// config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'labo',
  waitForConnections: true,
  connectionLimit: 30,
  queueLimit: 50
};

// Create pool with optimized settings
const poolOptions: PoolOptions = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Paramètres de pool pour limiter les connexions
  connectionLimit: 30, // Limiter le nombre maximum de connexions
  queueLimit: 0, // 0 = illimité, défini un nombre max pour limiter la file d'attente
  waitForConnections: true, // Attendre une connexion disponible ou rejeter
  connectTimeout: 10000, // Timeout de connexion en millisecondes
  // Paramètres pour améliorer la fermeture des connexions
  idleTimeout: 20000, // Réduire davantage le temps d'inactivité (20 secondes au lieu de 30)
  // Ajouter des paramètres pour gérer les connexions dormantes
  enableKeepAlive: false, // Désactiver keepAlive pour permettre aux connexions de se fermer
  // Configuration des timeouts MySQL pour fermer les connexions plus rapidement
  namedPlaceholders: true, // Utiliser des paramètres nommés (optimisation)
};

// Créer le pool de connexions
const pool: Pool = mysql.createPool(poolOptions);

// Helper function to handle database connections with explicit force release
export async function withConnection<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  let connection: PoolConnection | null = null;
  try {
    connection = await pool.getConnection();
    // Configurer un court timeout pour cette connexion spécifique
    await connection.query('SET SESSION interactive_timeout=60'); // 1 minute
    await connection.query('SET SESSION wait_timeout=60'); // 1 minute
    
    return await callback(connection);
  } finally {
    // Forcer la libération de la connexion, même en cas d'erreur
    if (connection) {
      try {
        connection.release();
      } catch (e) {
        console.error('Erreur lors de la libération de la connexion:', e);
      }
    }
  }
}

export default pool;

// Fonction utilitaire pour les requêtes simples
export async function query<T = any[]>(sql: string, params?: any[]): Promise<T> {
  // Utiliser pool.execute au lieu de pool.query pour les requêtes ponctuelles
  // Cela garantit que la connexion est rendue au pool immédiatement après l'exécution
  return withConnection(async (connection) => {
    try {
      let results;
      if (params && params.length > 0) {
        [results] = await connection.execute(sql, params);
      } else {
        // Utiliser query() au lieu d'execute() quand il n'y a pas de paramètres
        [results] = await connection.query(sql);
      }
      // Vérifier si le résultat est un tableau avant de le retourner
      if (Array.isArray(results)) {
        return results as T;
      }
      // Si ce n'est pas un tableau, c'est probablement un objet de résultat
      return results as unknown as T;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  });
}

// Fonction de nettoyage à appeler lors de l'arrêt de l'application
export async function closePool() {
  if (pool) {
    try {
      await pool.end();
    } catch (err) {
      console.error('Error closing database connection pool:', err);
    }
  }
}

// Initialiser la base de données
export async function initializeDatabase() {
  try {
    
    // ==================== TABLES POUR LES NOTIFICATIONS ====================
    
    // Créer la table des notifications
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        user_role VARCHAR(50) NOT NULL,
        target_roles JSON DEFAULT NULL,
        module VARCHAR(50) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        message JSON NOT NULL,
        details TEXT DEFAULT NULL,
        severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
        is_read BOOLEAN DEFAULT FALSE,
        entity_type VARCHAR(50) DEFAULT NULL,
        entity_id VARCHAR(255) DEFAULT NULL,
        triggered_by VARCHAR(100) DEFAULT NULL,
        reason ENUM('role', 'specific') DEFAULT 'role',
        specific_reason VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_user_role (user_role),
        INDEX idx_module (module),
        INDEX idx_is_read (is_read),
        INDEX idx_created_at (created_at),
        INDEX idx_severity (severity)
      )
    `);

    // Créer la table des préférences de notification
    await query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        user_role VARCHAR(50) NOT NULL,
        module VARCHAR(50) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_module_action (user_id, module, action_type),
        INDEX idx_user_id (user_id),
        INDEX idx_user_role (user_role)
      )
    `);

    // Créer la table des statuts de lecture (pour les notifications basées sur les rôles)
    await query(`
      CREATE TABLE IF NOT EXISTS notification_read_status (
        id INT AUTO_INCREMENT PRIMARY KEY,
        notification_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_notification_user (notification_id, user_id),
        FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
        INDEX idx_notification_id (notification_id),
        INDEX idx_user_id (user_id),
        INDEX idx_is_read (is_read)
      )
    `);

    // ==================== FIN TABLES NOTIFICATIONS ====================


    await query(`
      CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'TEACHER', 'STUDENT', 'ADMINLABO', 'LABORANTIN') NOT NULL,
    isActive TINYINT(1) NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    siteConfig JSON,
    associatedClasses JSON,
    customClasses JSON
  );
      )
    `);



    // Run migrations to update existing tables
    await updateFragmentsTable();

  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}