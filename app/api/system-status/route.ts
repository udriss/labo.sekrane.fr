export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { UserServiceSQL } from '@/lib/services/userService.sql';
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

    // État de la base de données (SQL)
    let dbStatus = 'Connectée';
    let dbResponseTime = 0;
    try {
      const startTime = Date.now();
      await UserServiceSQL.getAllActive();
      dbResponseTime = Date.now() - startTime;
    } catch (error) {
      dbStatus = 'Erreur';
    }

    // Compter les utilisateurs actifs (SQL)
    let activeUsers = 0;
    let totalUsers = 0;
    let activeUsersList: string[] = [];
    try {
      const users = await UserServiceSQL.getAllActive();
      totalUsers = users.length;
      // Utilisateurs actifs = ceux dont updatedAt < 30min
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const active = users.filter((user: any) => {
        if (!user.isActive) return false;
        const lastUpdate = new Date(user.updatedAt);
        return lastUpdate > thirtyMinutesAgo;
      });
      activeUsers = active.length;
      activeUsersList = active.map((u: any) => u.email).slice(0, 5);
    } catch (error) {
      console.error('Erreur comptage utilisateurs (SQL):', error);
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
      const tempData = await si.cpuTemperature();
      if (tempData.main && !isNaN(tempData.main)) {
        cpuTemperature = Math.round(tempData.main);
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