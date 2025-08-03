import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'int',
  password: process.env.DB_PASSWORD || '4Na9Gm8mdTVgnUp',
  database: process.env.DB_NAME || 'labo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function checkCorruptedData() {
  try {
    console.log('Checking database data...');
    const [rows] = await pool.execute('SELECT id, title, timeSlots, actuelTimeSlots, lastStateChange FROM calendar_chimie WHERE id = ?', ['7057e857-16ea-4176-bac0-8542e2364665']);
    
    if (rows.length > 0) {
      const row = rows[0];
      console.log('=== Event:', row.title, '===');
      console.log('timeSlots type:', typeof row.timeSlots);
      console.log('timeSlots value:', row.timeSlots);
      console.log('timeSlots length:', row.timeSlots?.length);
      console.log('---');
      console.log('actuelTimeSlots type:', typeof row.actuelTimeSlots);
      console.log('actuelTimeSlots value:', row.actuelTimeSlots);
      console.log('actuelTimeSlots length:', row.actuelTimeSlots?.length);
      console.log('---');
      console.log('lastStateChange type:', typeof row.lastStateChange);
      console.log('lastStateChange value:', row.lastStateChange);
      
      // Try to show first few characters
      if (row.timeSlots) {
        console.log('timeSlots first 100 chars:', row.timeSlots.substring(0, 100));
      }
      if (row.actuelTimeSlots) {
        console.log('actuelTimeSlots first 100 chars:', row.actuelTimeSlots.substring(0, 100));
      }
    } else {
      console.log('Event not found');
    }
    
    // Check all chemistry events with problematic data
    console.log('\n=== Checking all events with corrupted JSON ===');
    const [allRows] = await pool.execute('SELECT id, title, timeSlots, actuelTimeSlots FROM calendar_chimie LIMIT 5');
    
    allRows.forEach((row, index) => {
      console.log(`Event ${index + 1}: ${row.title}`);
      if (row.timeSlots && row.timeSlots.includes('[object Object]')) {
        console.log('  - timeSlots CORRUPTED:', row.timeSlots.substring(0, 50));
      }
      if (row.actuelTimeSlots && row.actuelTimeSlots.includes('[object Object]')) {
        console.log('  - actuelTimeSlots CORRUPTED:', row.actuelTimeSlots.substring(0, 50));
      }
    });
    
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await pool.end();
  }
}

checkCorruptedData();
