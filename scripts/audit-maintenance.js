#!/usr/bin/env node
// scripts/audit-maintenance.js

const fs = require('fs').promises;
const path = require('path');
const { createGzip } = require('zlib');
const { createReadStream, createWriteStream } = require('fs');

class AuditMaintenance {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.archiveDir = path.join(this.logDir, 'archives');
    this.indexDir = path.join(this.logDir, 'indexes');
  }

  async ensureDirectories() {
    await fs.mkdir(this.logDir, { recursive: true });
    await fs.mkdir(this.archiveDir, { recursive: true });
    await fs.mkdir(this.indexDir, { recursive: true });
  }

  async getAllLogFiles() {
    const files = [];
    
    try {
      const years = await fs.readdir(this.logDir);
      
      for (const year of years) {
        if (year === 'archives' || year === 'indexes') continue;
        
        const yearDir = path.join(this.logDir, year);
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

  async compressFile(filePath) {
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
          console.log(`Compressed: ${path.basename(filePath)}`);
          resolve();
        })
        .on('error', reject);
    });
  }

  async archiveOldFiles(olderThanDays = 30) {
    await this.ensureDirectories();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    console.log(`Archiving files older than ${cutoffDate.toISOString()}`);
    
    const files = await this.getAllLogFiles();
    let archivedCount = 0;
    
    for (const filePath of files) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.mtime < cutoffDate) {
          // Compress and move to archive
          await this.compressFile(filePath);
          const fileName = path.basename(filePath) + '.gz';
          const archivePath = path.join(this.archiveDir, fileName);
          await fs.rename(filePath + '.gz', archivePath);
          archivedCount++;
        }
      } catch (error) {
        console.error(`Error archiving ${filePath}:`, error);
      }
    }
    
    console.log(`Archived ${archivedCount} files`);
    return archivedCount;
  }

  async cleanupOldArchives(retentionDays = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    console.log(`Cleaning up archives older than ${cutoffDate.toISOString()}`);
    
    let deletedCount = 0;
    
    try {
      const archiveFiles = await fs.readdir(this.archiveDir);
      
      for (const file of archiveFiles) {
        const filePath = path.join(this.archiveDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`Deleted: ${file}`);
          deletedCount++;
        }
      }
    } catch (error) {
      console.error('Error cleaning up archives:', error);
    }
    
    console.log(`Deleted ${deletedCount} old archive files`);
    return deletedCount;
  }

  async rebuildIndexes() {
    console.log('Rebuilding audit indexes...');
    
    const index = {
      users: {},
      modules: {},
      actions: {},
      dates: {}
    };

    const files = await this.getAllLogFiles();
    let totalEntries = 0;
    
    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const entries = JSON.parse(content);
        totalEntries += entries.length;
        
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

    const indexPath = path.join(this.indexDir, 'main-index.json');
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    
    console.log(`Rebuilt indexes for ${totalEntries} entries across ${files.length} files`);
    return { totalEntries, totalFiles: files.length };
  }

  async generateReport() {
    console.log('Generating audit report...');
    
    const stats = {
      totalFiles: 0,
      totalEntries: 0,
      oldestEntry: null,
      newestEntry: null,
      byModule: {},
      byUser: {},
      filesSizes: [],
      totalSize: 0
    };

    const files = await this.getAllLogFiles();
    
    for (const filePath of files) {
      try {
        const fileStats = await fs.stat(filePath);
        stats.totalSize += fileStats.size;
        stats.filesSizes.push({ path: filePath, size: fileStats.size });
        
        const content = await fs.readFile(filePath, 'utf-8');
        const entries = JSON.parse(content);
        
        stats.totalFiles++;
        stats.totalEntries += entries.length;
        
        for (const entry of entries) {
          // Track oldest and newest
          const entryDate = new Date(entry.timestamp);
          if (!stats.oldestEntry || entryDate < new Date(stats.oldestEntry)) {
            stats.oldestEntry = entry.timestamp;
          }
          if (!stats.newestEntry || entryDate > new Date(stats.newestEntry)) {
            stats.newestEntry = entry.timestamp;
          }
          
          // Count by module
          stats.byModule[entry.action.module] = (stats.byModule[entry.action.module] || 0) + 1;
          
          // Count by user
          stats.byUser[entry.user.email] = (stats.byUser[entry.user.email] || 0) + 1;
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }

    // Sort files by size
    stats.filesSizes.sort((a, b) => b.size - a.size);
    
    // Generate report
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalFiles: stats.totalFiles,
        totalEntries: stats.totalEntries,
        totalSize: `${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`,
        dateRange: {
          oldest: stats.oldestEntry,
          newest: stats.newestEntry
        }
      },
      topModules: Object.entries(stats.byModule)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([module, count]) => ({ module, count })),
      topUsers: Object.entries(stats.byUser)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([user, count]) => ({ user, count })),
      largestFiles: stats.filesSizes.slice(0, 10)
        .map(({ path, size }) => ({
          file: path.replace(this.logDir, ''),
          size: `${(size / 1024).toFixed(2)} KB`
        }))
    };

    const reportPath = path.join(this.logDir, `audit-report-${new Date().toISOString().split('T')[0]}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    
    console.log('Report saved to:', reportPath);
    console.log('\n--- AUDIT REPORT ---');
    console.log(`Total Files: ${report.summary.totalFiles}`);
    console.log(`Total Entries: ${report.summary.totalEntries}`);
    console.log(`Total Size: ${report.summary.totalSize}`);
    console.log(`Date Range: ${report.summary.dateRange.oldest} to ${report.summary.dateRange.newest}`);
    console.log('\nTop Modules:');
    report.topModules.forEach(({ module, count }) => {
      console.log(`  ${module}: ${count}`);
    });
    console.log('\nTop Users:');
    report.topUsers.forEach(({ user, count }) => {
      console.log(`  ${user}: ${count}`);
    });
    
    return report;
  }

  async verifyIntegrity() {
    console.log('Verifying audit log integrity...');
    
    const files = await this.getAllLogFiles();
    const issues = [];
    let totalEntries = 0;
    
    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const entries = JSON.parse(content);
        
        totalEntries += entries.length;
        
        // Verify each entry has required fields
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const requiredFields = ['id', 'timestamp', 'user', 'action', 'context', 'status'];
          
          for (const field of requiredFields) {
            if (!entry[field]) {
              issues.push({
                file: filePath,
                entry: i,
                issue: `Missing required field: ${field}`,
                severity: 'error'
              });
            }
          }
          
          // Verify timestamp format
          if (entry.timestamp && isNaN(new Date(entry.timestamp).getTime())) {
            issues.push({
              file: filePath,
              entry: i,
              issue: 'Invalid timestamp format',
              severity: 'error'
            });
          }
          
          // Verify user object
          if (entry.user && (!entry.user.id || !entry.user.email)) {
            issues.push({
              file: filePath,
              entry: i,
              issue: 'Invalid user object (missing id or email)',
              severity: 'warning'
            });
          }
        }
        
        // Check for chronological order
        for (let i = 1; i < entries.length; i++) {
          const prevTime = new Date(entries[i-1].timestamp);
          const currTime = new Date(entries[i].timestamp);
          
          if (currTime < prevTime) {
            issues.push({
              file: filePath,
              entry: i,
              issue: 'Entries not in chronological order',
              severity: 'warning'
            });
          }
        }
        
      } catch (error) {
        issues.push({
          file: filePath,
          entry: null,
          issue: `File parsing error: ${error.message}`,
          severity: 'error'
        });
      }
    }
    
    console.log(`Verified ${totalEntries} entries across ${files.length} files`);
    console.log(`Found ${issues.length} issues`);
    
    if (issues.length > 0) {
      console.log('\n--- ISSUES FOUND ---');
      issues.forEach(issue => {
        console.log(`[${issue.severity.toUpperCase()}] ${issue.file}:${issue.entry || 'file'} - ${issue.issue}`);
      });
    } else {
      console.log('✅ All audit logs are valid');
    }
    
    return { totalEntries, totalFiles: files.length, issues };
  }
}

// CLI interface
async function main() {
  const maintenance = new AuditMaintenance();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'archive':
        const days = parseInt(process.argv[3]) || 30;
        await maintenance.archiveOldFiles(days);
        break;
        
      case 'cleanup':
        const retention = parseInt(process.argv[3]) || 365;
        await maintenance.cleanupOldArchives(retention);
        break;
        
      case 'reindex':
        await maintenance.rebuildIndexes();
        break;
        
      case 'report':
        await maintenance.generateReport();
        break;
        
      case 'verify':
        await maintenance.verifyIntegrity();
        break;
        
      case 'full':
        console.log('Running full maintenance...');
        await maintenance.archiveOldFiles(30);
        await maintenance.cleanupOldArchives(365);
        await maintenance.rebuildIndexes();
        await maintenance.generateReport();
        await maintenance.verifyIntegrity();
        console.log('Full maintenance completed');
        break;
        
      default:
        console.log('Usage: node audit-maintenance.js [command] [options]');
        console.log('Commands:');
        console.log('  archive [days]    - Archive files older than X days (default: 30)');
        console.log('  cleanup [days]    - Delete archives older than X days (default: 365)');
        console.log('  reindex          - Rebuild search indexes');
        console.log('  report           - Generate statistics report');
        console.log('  verify           - Verify log integrity');
        console.log('  full             - Run all maintenance tasks');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error during maintenance:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = AuditMaintenance;
