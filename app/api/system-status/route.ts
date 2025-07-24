import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import si from 'systeminformation';

export async function GET() {
  try {
    // Calcul de l'uptime
    const uptimeSeconds = process.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptime = `${days}j ${hours}h ${minutes}m`;

    // CPU - Utilisation de systeminformation
    const cpuData = await si.cpu();
    const currentLoad = await si.currentLoad();
    const cpuModel = cpuData.brand;
    const cpuCores = cpuData.cores;
    const cpuLoad = Math.round(currentLoad.currentLoad);

    // Mémoire - Utilisation de systeminformation
    const mem = await si.mem();
    const ramPercentage = Math.round((mem.used / mem.total) * 100);
    const ram = `${(mem.used / 1024 / 1024 / 1024).toFixed(1)} GB / ${(mem.total / 1024 / 1024 / 1024).toFixed(1)} GB`;

    // Stockage - Utilisation de systeminformation
    const disk = await si.fsSize();
    const mainDisk = disk[0] || { used: 0, size: 1, use: 0 };
    const storagePercentage = Math.round(mainDisk.use);
    const storage = `${(mainDisk.used / 1024 / 1024 / 1024).toFixed(1)} GB / ${(mainDisk.size / 1024 / 1024 / 1024).toFixed(1)} GB`;

    // État de la base de données
    let dbStatus = 'Connectée';
    let dbResponseTime = 0;
    try {
      const startTime = Date.now();
      // Vérifier l'accès aux fichiers JSON
      await fs.access(path.join(process.cwd(), 'data', 'users.json'));
      dbResponseTime = Date.now() - startTime;
    } catch (error) {
      dbStatus = 'Erreur';
    }

    // Compter les utilisateurs actifs depuis le fichier de sessions
    let activeUsers = 0;
    let totalUsers = 0;
    let activeUsersList: string[] = [];

    try {
      // Lire le nombre total d'utilisateurs
      const usersPath = path.join(process.cwd(), 'data', 'users.json');
      const usersData = await fs.readFile(usersPath, 'utf-8');
      const { users } = JSON.parse(usersData);
      totalUsers = users.length;

      // Lire les sessions actives
      const sessionsPath = path.join(process.cwd(), 'data', 'active-sessions.json');
      try {
        const sessionsData = await fs.readFile(sessionsPath, 'utf-8');
        const sessions = JSON.parse(sessionsData);
        
        // Nettoyer les sessions expirées
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const activeSessions = Object.entries(sessions).filter(([_, data]: [string, any]) => {
          return new Date(data.lastActivity) > thirtyMinutesAgo;
        });
        
        activeUsers = activeSessions.length;
        activeUsersList = activeSessions.map(([email]) => email);
      } catch {
        // Pas de fichier de sessions, utiliser la méthode de fallback
        const now = new Date();
        activeUsers = users.filter((user: any) => {
          if (!user.isActive) return false;
          const lastUpdate = new Date(user.updatedAt);
          const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
          return diffMinutes < 30;
        }).length;
      }
    } catch (error) {
      console.error('Erreur comptage utilisateurs:', error);
    }

    // Version de l'application
    let appVersion = '2.0.0';
    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      appVersion = packageJson.version || '2.0.0';
    } catch (error) {
      console.error('Erreur lecture package.json:', error);
    }

    // Informations système supplémentaires
    const osInfo = await si.osInfo();
    const networkStats = await si.networkStats();
    const networkInterface = networkStats[0] || { rx_sec: 0, tx_sec: 0 };

    // Température CPU (si disponible)
    let cpuTemperature = null;
    try {
      const temps = await si.cpuTemperature();
      if (temps.main) {
        cpuTemperature = Math.round(temps.main);
      }
    } catch {
      // Pas de données de température disponibles
    }

    // Statistiques complètes
    const stats = {
      // Système
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      nodeVersion: process.version,
      appVersion,
      
      // Performance
      dbStatus,
      dbResponseTime,
      ram,
      ramPercentage,
      ramUsed: (mem.used / 1024 / 1024 / 1024).toFixed(1),
      ramTotal: (mem.total / 1024 / 1024 / 1024).toFixed(1),
      storage,
      storagePercentage,
      storageUsed: (mainDisk.used / 1024 / 1024 / 1024).toFixed(1),
      storageTotal: (mainDisk.size / 1024 / 1024 / 1024).toFixed(1),
      cpuModel,
      cpuCores,
      cpuLoad,
      cpuTemperature,
      
      // Réseau
      network: {
        download: `${(networkInterface.rx_sec / 1024).toFixed(1)} KB/s`,
        upload: `${(networkInterface.tx_sec / 1024).toFixed(1)} KB/s`,
      },
      
      // Activité
      uptime,
      activeUsers,
      totalUsers,
      activeUsersList: activeUsersList.slice(0, 5), // Les 5 premiers pour la confidentialité
      
      // Santé du système
      health: {
        database: dbStatus === 'Connectée',
        memory: ramPercentage < 80,
        storage: storagePercentage < 80,
        cpu: cpuLoad < 80,
        temperature: !cpuTemperature || cpuTemperature < 70,
      },
      
      // Alertes
      alerts: {
        highMemory: ramPercentage > 80,
        highStorage: storagePercentage > 80,
        highCpu: cpuLoad > 80,
        highTemperature: cpuTemperature && cpuTemperature > 70,
        dbError: dbStatus !== 'Connectée',
      },
      
      // Timestamp
      lastUpdate: new Date().toISOString(),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erreur système:', error);
    
    // Retour en mode dégradé avec des données basiques
    return NextResponse.json({
      error: 'Données partielles',
      platform: process.platform,
      nodeVersion: process.version,
      appVersion: '2.0.0',
      dbStatus: 'Inconnu',
      dbResponseTime: 0,
      ram: 'N/A',
      ramPercentage: 0,
      storage: 'N/A',
      storagePercentage: 0,
      cpuModel: 'Inconnu',
      cpuCores: 1,
      cpuLoad: 0,
      uptime: 'Inconnu',
      activeUsers: 0,
      totalUsers: 0,
      health: {
        database: false,
        memory: true,
        storage: true,
        cpu: true,
      },
      lastUpdate: new Date().toISOString(),
    });
  }
}