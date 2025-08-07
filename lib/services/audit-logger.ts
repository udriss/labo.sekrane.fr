// lib/services/audit-logger.ts
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createWriteStream, createReadStream } from 'fs';
import { createGzip } from 'zlib';
import { LogEntry, AuditAction, AuditUser, AuditContext, LogFilters, DateRange, LogIndex, AuditStats } from '@/types/audit';

interface WriteBuffer {
  entries: LogEntry[];
  lastFlush: number;
}

class AuditLogger {
  private static instance: AuditLogger;
  private writeBuffer: WriteBuffer = { entries: [], lastFlush: Date.now() };
  private readonly maxBufferSize = 100;
  private readonly flushInterval = 5000; // 5 seconds
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private flushTimer?: NodeJS.Timeout;
  private isWriting = false;
  private writingPromise?: Promise<void>;

  private constructor() {
    this.startFlushTimer();
    this.ensureDirectories();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  private async ensureDirectories(): Promise<void> {
    const baseDir = path.join(process.cwd(), 'logs');
    const archiveDir = path.join(baseDir, 'archives');
    const indexDir = path.join(baseDir, 'indexes');
    
    await fs.mkdir(baseDir, { recursive: true });
    await fs.mkdir(archiveDir, { recursive: true });
    await fs.mkdir(indexDir, { recursive: true });
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.writeBuffer.entries.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private getLogFilePath(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const logDir = path.join(process.cwd(), 'logs', String(year), month);
    return path.join(logDir, `audit-${year}-${month}-${day}.json`);
  }

  private async ensureLogFile(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    try {
      await fs.access(filePath);
    } catch {
      // File doesn't exist, create it with empty array
      await fs.writeFile(filePath, '[]', 'utf-8');
    }
  }

  private async appendToLogFile(filePath: string, entries: LogEntry[]): Promise<void> {
    await this.ensureLogFile(filePath);
    
    // Read existing content
    const existingContent = await fs.readFile(filePath, 'utf-8');
    let existingEntries: LogEntry[] = [];
    
    try {
      existingEntries = JSON.parse(existingContent);
    } catch (error) {
      console.error('Error parsing existing log file:', error);
      existingEntries = [];
    }
    
    // Append new entries
    const allEntries = [...existingEntries, ...entries];
    
    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(allEntries, null, 2), 'utf-8');
    
    // Check if file size exceeds limit and rotate if needed
    await this.checkAndRotateFile(filePath);
  }

  private async checkAndRotateFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > this.maxFileSize) {
        await this.rotateFile(filePath);
      }
    } catch (error) {
      console.error('Error checking file size:', error);
    }
  }

  private async rotateFile(filePath: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = filePath.replace('.json', `-${timestamp}.json`);
    
    // Move current file to rotated name
    await fs.rename(filePath, rotatedPath);
    
    // Compress the rotated file
    await this.compressFile(rotatedPath);
    
    // Create new empty log file
    await fs.writeFile(filePath, '[]', 'utf-8');
  }

  private async compressFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const gzipPath = filePath + '.gz';
      const readStream = createReadStream(filePath);
      const writeStream = createWriteStream(gzipPath);
      const gzip = createGzip();
      
      readStream
        .pipe(gzip)
        .pipe(writeStream)
        .on('finish', async () => {
          // Remove original file after compression
          await fs.unlink(filePath);
          resolve();
        })
        .on('error', reject);
    });
  }

  private async flush(): Promise<void> {
    if (this.isWriting || this.writeBuffer.entries.length === 0) {
      return;
    }

    if (this.writingPromise) {
      await this.writingPromise;
    }

    this.isWriting = true;
    const entriesToWrite = [...this.writeBuffer.entries];
    this.writeBuffer.entries = [];
    this.writeBuffer.lastFlush = Date.now();

    this.writingPromise = this.writeEntries(entriesToWrite);
    
    try {
      await this.writingPromise;
    } catch (error) {
      console.error('Error writing audit logs:', error);
      // Put entries back in buffer if write failed
      this.writeBuffer.entries.unshift(...entriesToWrite);
    } finally {
      this.isWriting = false;
      this.writingPromise = undefined;
    }
  }

  private async writeEntries(entries: LogEntry[]): Promise<void> {
    // Group entries by date
    const entriesByDate = new Map<string, LogEntry[]>();
    
    for (const entry of entries) {
      const date = entry.timestamp.split('T')[0];
      if (!entriesByDate.has(date)) {
        entriesByDate.set(date, []);
      }
      entriesByDate.get(date)!.push(entry);
    }

    // Write to appropriate files
    const writePromises = Array.from(entriesByDate.entries()).map(async ([dateStr, dateEntries]) => {
      const date = new Date(dateStr);
      const filePath = this.getLogFilePath(date);
      await this.appendToLogFile(filePath, dateEntries);
    });

    await Promise.all(writePromises);
    
    // Update indexes after writing
    await this.updateIndexes(entries);
  }

  private async updateIndexes(entries: LogEntry[]): Promise<void> {
    const indexPath = path.join(process.cwd(), 'logs', 'indexes', 'main-index.json');
    
    let index: LogIndex = {
      users: {},
      modules: {},
      actions: {},
      dates: {}
    };

    try {
      const existingIndex = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(existingIndex);
    } catch {
      // Index doesn't exist or is invalid, start fresh
    }

    for (const entry of entries) {
      const date = entry.timestamp.split('T')[0];
      const filePath = this.getLogFilePath(new Date(entry.timestamp));

      // Update user index
      if (!index.users[entry.user.id]) {
        index.users[entry.user.id] = [];
      }
      if (!index.users[entry.user.id].includes(filePath)) {
        index.users[entry.user.id].push(filePath);
      }

      // Update module index
      if (!index.modules[entry.action.module]) {
        index.modules[entry.action.module] = [];
      }
      if (!index.modules[entry.action.module].includes(filePath)) {
        index.modules[entry.action.module].push(filePath);
      }

      // Update action index
      if (!index.actions[entry.action.type]) {
        index.actions[entry.action.type] = [];
      }
      if (!index.actions[entry.action.type].includes(filePath)) {
        index.actions[entry.action.type].push(filePath);
      }

      // Update date index
      index.dates[date] = filePath;
    }

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  async log(action: AuditAction, user: AuditUser, context: AuditContext, details?: any): Promise<void> {
    const entry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      user,
      action,
      details,
      context,
      status: 'SUCCESS'
    };

    this.writeBuffer.entries.push(entry);

    // Flush immediately if buffer is full
    if (this.writeBuffer.entries.length >= this.maxBufferSize) {
      await this.flush();
    }
  }

  async logBulk(entries: Omit<LogEntry, 'id' | 'timestamp'>[]): Promise<void> {
    const logEntries: LogEntry[] = entries.map(entry => ({
      ...entry,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    }));

    this.writeBuffer.entries.push(...logEntries);

    // Flush if buffer is full
    if (this.writeBuffer.entries.length >= this.maxBufferSize) {
      await this.flush();
    }
  }

  async query(filters: LogFilters): Promise<LogEntry[]> {
    const results: LogEntry[] = [];
    const filesToSearch = await this.getRelevantFiles(filters);

    for (const filePath of filesToSearch) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const entries: LogEntry[] = JSON.parse(content);
        
        const filteredEntries = this.filterEntries(entries, filters);
        results.push(...filteredEntries);
      } catch (error) {
        console.error(`Error reading log file ${filePath}:`, error);
      }
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    
    return results.slice(offset, offset + limit);
  }

  private async getRelevantFiles(filters: LogFilters): Promise<string[]> {
    const indexPath = path.join(process.cwd(), 'logs', 'indexes', 'main-index.json');
    let filePaths = new Set<string>();

    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      const index: LogIndex = JSON.parse(indexContent);

      // If we have specific filters, use index to narrow down files
      if (filters.userId && index.users[filters.userId]) {
        index.users[filters.userId].forEach(path => filePaths.add(path));
      } else if (filters.module && index.modules[filters.module]) {
        index.modules[filters.module].forEach(path => filePaths.add(path));
      } else if (filters.action && index.actions[filters.action]) {
        index.actions[filters.action].forEach(path => filePaths.add(path));
      } else if (filters.startDate || filters.endDate) {
        // Filter by date range
        const startDate = filters.startDate || new Date('2000-01-01');
        const endDate = filters.endDate || new Date();
        
        Object.entries(index.dates).forEach(([dateStr, filePath]) => {
          const fileDate = new Date(dateStr);
          if (fileDate >= startDate && fileDate <= endDate) {
            filePaths.add(filePath);
          }
        });
      } else {
        // No specific filters, include all files
        Object.values(index.dates).forEach(path => filePaths.add(path));
      }
    } catch (error) {
      console.error('Error reading index file:', error);
      // Fallback: scan all log files et créer l'index si nécessaire
      await this.initializeIndex();
      filePaths = new Set(await this.getAllLogFiles());
    }

    return Array.from(filePaths);
  }

  private async getAllLogFiles(): Promise<string[]> {
    const logDir = path.join(process.cwd(), 'logs');
    const files: string[] = [];
    
    try {
      const years = await fs.readdir(logDir);
      
      for (const year of years) {
        if (year === 'archives' || year === 'indexes') continue;
        
        const yearDir = path.join(logDir, year);
        const months = await fs.readdir(yearDir);
        
        for (const month of months) {
          const monthDir = path.join(yearDir, month);
          const dayFiles = await fs.readdir(monthDir);
          
          for (const dayFile of dayFiles) {
            if (dayFile.endsWith('.json') && !dayFile.endsWith('.gz')) {
              files.push(path.join(monthDir, dayFile));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error scanning log directories:', error);
    }
    
    return files;
  }

  private filterEntries(entries: LogEntry[], filters: LogFilters): LogEntry[] {
    return entries.filter(entry => {
      if (filters.userId && entry.user.id !== filters.userId) return false;
      if (filters.module && entry.action.module !== filters.module) return false;
      if (filters.action && entry.action.type !== filters.action) return false;
      if (filters.entityId && entry.action.entityId !== filters.entityId) return false;
      if (filters.status && entry.status !== filters.status) return false;
      
      const entryDate = new Date(entry.timestamp);
      if (filters.startDate && entryDate < filters.startDate) return false;
      if (filters.endDate && entryDate > filters.endDate) return false;
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchableText = JSON.stringify(entry).toLowerCase();
        if (!searchableText.includes(searchTerm)) return false;
      }
      
      return true;
    });
  }

  async getUserActivity(userId: string, dateRange?: DateRange): Promise<LogEntry[]> {
    return this.query({
      userId,
      startDate: dateRange?.start,
      endDate: dateRange?.end,
      limit: 1000
    });
  }

  async getModuleActivity(module: string, dateRange?: DateRange): Promise<LogEntry[]> {
    return this.query({
      module,
      startDate: dateRange?.start,
      endDate: dateRange?.end,
      limit: 1000
    });
  }

  async getStats(dateRange?: DateRange): Promise<AuditStats> {
    const entries = await this.query({
      startDate: dateRange?.start,
      endDate: dateRange?.end,
      limit: 10000 // Reasonable limit for stats calculation
    });

    const stats: AuditStats = {
      totalEntries: entries.length,
      byModule: {},
      byAction: {},
      byUser: {},
      byStatus: {},
      dateRange: {
        earliest: entries[entries.length - 1]?.timestamp || '',
        latest: entries[0]?.timestamp || ''
      }
    };

    entries.forEach(entry => {
      // Count by module
      stats.byModule[entry.action.module] = (stats.byModule[entry.action.module] || 0) + 1;
      
      // Count by action
      stats.byAction[entry.action.type] = (stats.byAction[entry.action.type] || 0) + 1;
      
      // Count by user
      stats.byUser[entry.user.email] = (stats.byUser[entry.user.email] || 0) + 1;
      
      // Count by status
      stats.byStatus[entry.status] = (stats.byStatus[entry.status] || 0) + 1;
    });

    return stats;
  }

  async archive(olderThan: Date): Promise<void> {
    const logDir = path.join(process.cwd(), 'logs');
    const archiveDir = path.join(logDir, 'archives');
    
    const files = await this.getAllLogFiles();
    
    for (const filePath of files) {
      const stats = await fs.stat(filePath);
      if (stats.mtime < olderThan) {
        const fileName = path.basename(filePath);
        const archivePath = path.join(archiveDir, fileName);
        
        // Compress and move to archive
        await this.compressFile(filePath);
        const gzPath = filePath + '.gz';
        await fs.rename(gzPath, archivePath + '.gz');
      }
    }
    
    // Rebuild indexes after archiving
    await this.rebuildIndexes();
  }

  async cleanup(retentionDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    await this.archive(cutoffDate);
    
    // Remove very old archives
    const archiveDir = path.join(process.cwd(), 'logs', 'archives');
    const veryOldDate = new Date();
    veryOldDate.setDate(veryOldDate.getDate() - (retentionDays * 2));
    
    try {
      const archiveFiles = await fs.readdir(archiveDir);
      
      for (const file of archiveFiles) {
        const filePath = path.join(archiveDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < veryOldDate) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up archives:', error);
    }
  }

  async rebuildIndexes(): Promise<void> {
    const index: LogIndex = {
      users: {},
      modules: {},
      actions: {},
      dates: {}
    };

    const files = await this.getAllLogFiles();
    
    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const entries: LogEntry[] = JSON.parse(content);
        
        for (const entry of entries) {
          const date = entry.timestamp.split('T')[0];
          
          // Update indexes
          if (!index.users[entry.user.id]) index.users[entry.user.id] = [];
          if (!index.users[entry.user.id].includes(filePath)) {
            index.users[entry.user.id].push(filePath);
          }
          
          if (!index.modules[entry.action.module]) index.modules[entry.action.module] = [];
          if (!index.modules[entry.action.module].includes(filePath)) {
            index.modules[entry.action.module].push(filePath);
          }
          
          if (!index.actions[entry.action.type]) index.actions[entry.action.type] = [];
          if (!index.actions[entry.action.type].includes(filePath)) {
            index.actions[entry.action.type].push(filePath);
          }
          
          index.dates[date] = filePath;
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }

    const indexPath = path.join(process.cwd(), 'logs', 'indexes', 'main-index.json');
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  async forceFlush(): Promise<void> {
    await this.flush();
  }

  /**
   * Initialise l'index principal s'il n'existe pas
   */
  private async initializeIndex(): Promise<void> {
    const indexPath = path.join(process.cwd(), 'logs', 'indexes', 'main-index.json');
    
    try {
      // Vérifier si l'index existe déjà
      await fs.access(indexPath);
    } catch {
      // Créer le répertoire s'il n'existe pas
      await fs.mkdir(path.dirname(indexPath), { recursive: true });
      
      // Créer un index vide
      const emptyIndex = {
        users: {},
        modules: {},
        actions: {},
        dates: {}
      };
      
      await fs.writeFile(indexPath, JSON.stringify(emptyIndex, null, 2));
      
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Force final flush
    this.forceFlush();
  }
}

export const auditLogger = AuditLogger.getInstance();
