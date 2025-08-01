// lib/services/classService.sql.ts

import { withConnection } from '@/lib/db';

export interface ClassData {
  id: string;
  name: string;
  type: 'predefined' | 'custom';
  created_at: string;
  created_by: string;
  user_id?: string;
  user_email?: string;
  updated_at: string;
}

export interface ClassesResponse {
  predefinedClasses: ClassData[];
  customClasses: ClassData[];
}

export class ClassServiceSQL {
  
  // Récupérer toutes les classes (prédéfinies et personnalisées)
  static async getAllClasses(): Promise<ClassesResponse> {
    return withConnection(async (connection) => {
      const [rows] = await connection.execute(`
        SELECT * FROM classes ORDER BY type, name
      `);
      
      const classes = rows as ClassData[];
      
      return {
        predefinedClasses: classes.filter(c => c.type === 'predefined'),
        customClasses: classes.filter(c => c.type === 'custom')
      };
    });
  }

  // Récupérer les classes pour un utilisateur spécifique
  static async getClassesForUser(userId: string): Promise<ClassesResponse> {
    return withConnection(async (connection) => {
      const [rows] = await connection.execute(`
        SELECT * FROM classes 
        WHERE type = 'predefined' OR user_id = ?
        ORDER BY type, name
      `, [userId]);
      
      const classes = rows as ClassData[];
      
      return {
        predefinedClasses: classes.filter(c => c.type === 'predefined'),
        customClasses: classes.filter(c => c.type === 'custom')
      };
    });
  }

  // Créer une nouvelle classe personnalisée
  static async createCustomClass(
    name: string, 
    userId: string, 
    userEmail: string, 
    createdBy: string
  ): Promise<ClassData> {
    return withConnection(async (connection) => {
      const classId = `CLASS_CUSTOM_${Date.now()}_${userId}`;
      
      await connection.execute(`
        INSERT INTO classes (id, name, type, created_by, user_id, user_email)
        VALUES (?, ?, 'custom', ?, ?, ?)
      `, [classId, name, createdBy, userId, userEmail]);
      
      const [rows] = await connection.execute(`
        SELECT * FROM classes WHERE id = ?
      `, [classId]);
      
      const classes = rows as ClassData[];
      return classes[0];
    });
  }

  // Supprimer une classe personnalisée
  static async deleteCustomClass(classId: string, userId: string): Promise<boolean> {
    return withConnection(async (connection) => {
      const [result] = await connection.execute(`
        DELETE FROM classes 
        WHERE id = ? AND type = 'custom' AND user_id = ?
      `, [classId, userId]);
      
      return (result as any).affectedRows > 0;
    });
  }

  // Supprimer une classe personnalisée par email
  static async deleteCustomClassByEmail(email: string, userId: string): Promise<boolean> {
    return withConnection(async (connection) => {
      const [result] = await connection.execute(`
        DELETE FROM classes 
        WHERE user_email = ? AND type = 'custom' AND user_id = ?
      `, [email, userId]);
      
      return (result as any).affectedRows > 0;
    });
  }

  // Mettre à jour une classe personnalisée
  static async updateCustomClass(
    classId: string, 
    name: string, 
    userId: string
  ): Promise<ClassData | null> {
    return withConnection(async (connection) => {
      await connection.execute(`
        UPDATE classes 
        SET name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND type = 'custom' AND user_id = ?
      `, [name, classId, userId]);
      
      const [rows] = await connection.execute(`
        SELECT * FROM classes WHERE id = ?
      `, [classId]);
      
      const classes = rows as ClassData[];
      return classes.length > 0 ? classes[0] : null;
    });
  }

  // Vérifier si une classe existe
  static async classExists(name: string, userId?: string): Promise<boolean> {
    return withConnection(async (connection) => {
      let query = 'SELECT COUNT(*) as count FROM classes WHERE name = ?';
      let params = [name];
      
      if (userId) {
        query += ' AND (type = "predefined" OR user_id = ?)';
        params.push(userId);
      }
      
      const [rows] = await connection.execute(query, params);
      const result = rows as [{ count: number }];
      return result[0].count > 0;
    });
  }

  // Migrer les données depuis le fichier JSON (utilisé une seule fois)
  static async migrateFromJSON(jsonData: any): Promise<void> {
    return withConnection(async (connection) => {
      // Nettoyer les données existantes (sauf les prédéfinies du système)
      await connection.execute(`
        DELETE FROM classes WHERE created_by != 'SYSTEM'
      `);
      
      // Migrer les classes prédéfinies
      if (jsonData.predefinedClasses) {
        for (const classData of jsonData.predefinedClasses) {
          await connection.execute(`
            INSERT IGNORE INTO classes (id, name, type, created_by, created_at)
            VALUES (?, ?, 'predefined', ?, ?)
          `, [
            classData.id, 
            classData.name, 
            classData.createdBy || 'MIGRATION',
            classData.createdAt || new Date().toISOString()
          ]);
        }
      }
      
      // Migrer les classes personnalisées
      if (jsonData.customClasses) {
        for (const classData of jsonData.customClasses) {
          await connection.execute(`
            INSERT IGNORE INTO classes (id, name, type, created_by, user_id, user_email, created_at)
            VALUES (?, ?, 'custom', ?, ?, ?, ?)
          `, [
            classData.id, 
            classData.name, 
            classData.createdBy || 'MIGRATION',
            classData.userId || null,
            classData.userEmail || null,
            classData.createdAt || new Date().toISOString()
          ]);
        }
      }
    });
  }
}
