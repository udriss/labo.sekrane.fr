// lib/services/userService.ts
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

interface SiteConfig {
  materialsViewMode?: 'list' | 'cards';
  chemicalsViewMode?: 'list' | 'cards';
  theme?: 'light' | 'dark';
  language?: string;
  notifications?: {
    email: boolean;
    push: boolean;
  };
  dashboard?: {
    defaultView: string;
    widgetsOrder: string[];
  };
  lastUpdated?: string;
}

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'ADMINLABO' | 'LABORANTIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  siteConfig?: SiteConfig;
  associatedClasses?: string[];
  customClasses?: string[];
}

interface UsersData {
  users: User[];
}

export class UserService {
  private static dataPath = path.join(process.cwd(), 'data', 'users.json');

  // Lire tous les utilisateurs
  private static async readUsers(): Promise<UsersData> {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier users.json:', error);
      return { users: [] };
    }
  }

  // Écrire les utilisateurs
  private static async writeUsers(data: UsersData): Promise<void> {
    try {
      await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Erreur lors de l\'écriture du fichier users.json:', error);
      throw error;
    }
  }

  // Trouver un utilisateur par email
  static async findByEmail(email: string): Promise<User | null> {
    const data = await this.readUsers();
    const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  }

  // Trouver un utilisateur par ID
  static async findById(id: string): Promise<User | null> {
    const data = await this.readUsers();
    const user = data.users.find(u => u.id === id);
    return user || null;
  }

  // Vérifier le mot de passe
  static async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user || !user.isActive) return null;

    // Supporter les différents formats de hash (bcrypt avec $2a$ ou $2b$)
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    return user;
  }

  // Créer un nouvel utilisateur
  static async create(userData: {
    email: string;
    password: string;
    name: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT';
    associatedClasses?: string[];
    customClasses?: string[];
  }): Promise<User> {
    const data = await this.readUsers();
    
    // Vérifier si l'email existe déjà
    if (data.users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new Error('Un utilisateur avec cet email existe déjà');
    }

    // Hasher le mot de passe avec le préfixe $2b$ (compatible avec votre format)
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    // Générer un ID unique
    const lastId = data.users
      .map(u => parseInt(u.id.split('_')[1]))
      .sort((a, b) => b - a)[0] || 0;
    const newId = `USER_${String(lastId + 1).padStart(3, '0')}`;

    const now = new Date().toISOString();
    
    // Créer le nouvel utilisateur
    const newUser: User = {
      id: newId,
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      role: userData.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      siteConfig: {
        materialsViewMode: 'list',
        chemicalsViewMode: 'list',
        theme: 'light',
        language: 'fr'
      },
      associatedClasses: userData.associatedClasses || [],
      customClasses: userData.customClasses || []
    };

    data.users.push(newUser);
    await this.writeUsers(data);

    return newUser;
  }

  // Mettre à jour un utilisateur
  static async update(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const data = await this.readUsers();
    const userIndex = data.users.findIndex(u => u.id === id);
    
    if (userIndex === -1) return null;

    // Si le mot de passe est mis à jour, le hasher
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 12);
    }

    // Mettre à jour updatedAt
    updates.updatedAt = new Date().toISOString();

    data.users[userIndex] = { ...data.users[userIndex], ...updates };
    await this.writeUsers(data);
    
    return data.users[userIndex];
  }

  // Obtenir tous les utilisateurs actifs
  static async getAllActive(): Promise<User[]> {
    const data = await this.readUsers();
    return data.users.filter(u => u.isActive);
  }

  // Désactiver un utilisateur (au lieu de le supprimer)
  static async deactivate(id: string): Promise<boolean> {
    const data = await this.readUsers();
    const userIndex = data.users.findIndex(u => u.id === id);
    
    if (userIndex === -1) return false;
    
    data.users[userIndex].isActive = false;
    data.users[userIndex].updatedAt = new Date().toISOString();
    
    await this.writeUsers(data);
    return true;
  }
}