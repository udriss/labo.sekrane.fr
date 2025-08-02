// This file has been archived. The legacy code has been removed.
// lib/services/userService.sql.ts
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'ADMINLABO' | 'LABORANTIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  siteConfig?: any;
  associatedClasses?: string[];
  customClasses?: string[];
}

export class UserServiceSQL {
  // Trouver un utilisateur par email
    static async findByEmail(email: string): Promise<User | null> {
    const rows = await query(
        'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
        [email]
    );
    
    // Vérifier si on a des résultats
    if (!rows || rows.length === 0) return null;
    return UserServiceSQL.deserialize(rows[0]);
    }

  // Trouver un utilisateur par ID
  static async findById(id: string): Promise<User | null> {
    const userId = parseInt(id, 10);
    const rows = await query(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    return UserServiceSQL.deserialize(rows[0]); // Utiliser deserialize et prendre le premier élément
  }


  // Vérifier le mot de passe
  static async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    
    if (!user || !user.isActive) {
    
    return null;
    }
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) return null;
    return user;
  }

  // Créer un nouvel utilisateur
  static async create(userData: {
    email: string;
    password: string;
    name: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'ADMINLABO' | 'LABORANTIN';
    associatedClasses?: string[];
    customClasses?: string[];
  }): Promise<User | null> {
    // Vérifier si l'email existe déjà
    const existing = await this.findByEmail(userData.email);
    if (existing) throw new Error('Un utilisateur avec cet email existe déjà');
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const now = new Date().toISOString();
    const [result] = await query(
      `INSERT INTO users (email, password, name, role, isActive, createdAt, updatedAt, siteConfig, associatedClasses, customClasses)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
      [
        userData.email,
        hashedPassword,
        userData.name,
        userData.role,
        now,
        now,
        JSON.stringify({ materialsViewMode: 'list', chemicalsViewMode: 'list', theme: 'light', language: 'fr' }),
        JSON.stringify(userData.associatedClasses || []),
        JSON.stringify(userData.customClasses || [])
      ]
    );
    
    // Récupérer l'utilisateur créé
    const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [userData.email]);
    
    if (!rows || rows.length === 0) {
      throw new Error('Erreur lors de la récupération de l\'utilisateur créé');
    }
    
    return UserServiceSQL.deserialize(rows[0]);
  }

  // Mettre à jour un utilisateur
  static async update(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const fields = [];
    const values = [];
    if (updates.email) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.password) {
      const hashed = await bcrypt.hash(updates.password, 12);
      fields.push('password = ?'); values.push(hashed);
    }
    if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.role) { fields.push('role = ?'); values.push(updates.role); }
    if (updates.isActive !== undefined) { fields.push('isActive = ?'); values.push(updates.isActive ? 1 : 0); }
    if (updates.siteConfig) { fields.push('siteConfig = ?'); values.push(JSON.stringify(updates.siteConfig)); }
    if (updates.associatedClasses) { fields.push('associatedClasses = ?'); values.push(JSON.stringify(updates.associatedClasses)); }
    if (updates.customClasses) { fields.push('customClasses = ?'); values.push(JSON.stringify(updates.customClasses)); }
    // Format MySQL DATETIME: YYYY-MM-DD HH:mm:ss
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const mysqlDatetime = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    fields.push('updatedAt = ?'); values.push(mysqlDatetime);
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  // Obtenir tous les utilisateurs actifs
  static async getAllActive(): Promise<User[]> {
    const rows = await query('SELECT * FROM users WHERE isActive = 1');
    
    if (!Array.isArray(rows)) {
      return [];
    }
    
    return rows.map(UserServiceSQL.deserialize).filter(Boolean) as User[];
  }

  // Désactiver un utilisateur
  static async deactivate(id: string): Promise<boolean> {
    await query('UPDATE users SET isActive = 0, updatedAt = ? WHERE id = ?', [new Date().toISOString(), id]);
    return true;
  }

  // Désérialiser un utilisateur SQL -> JS
  private static deserialize(row: any): User | null {
    if (!row) return null;
    return {
      id: row.id?.toString() || '',
      email: row.email,
      password: row.password,
      name: row.name,
      role: row.role,
      isActive: !!row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      siteConfig: row.siteConfig
        ? (typeof row.siteConfig === 'string'
            ? JSON.parse(row.siteConfig)
            : row.siteConfig)
        : undefined,
      associatedClasses: row.associatedClasses
        ? (typeof row.associatedClasses === 'string' && row.associatedClasses.trim() !== ''
            ? JSON.parse(row.associatedClasses)
            : Array.isArray(row.associatedClasses)
              ? row.associatedClasses
              : [])
        : [],
      customClasses: row.customClasses
        ? (typeof row.customClasses === 'string' && row.customClasses.trim() !== ''
            ? JSON.parse(row.customClasses)
            : Array.isArray(row.customClasses)
              ? row.customClasses
              : [])
        : []
    };
  }
}
