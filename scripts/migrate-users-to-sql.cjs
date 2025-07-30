// scripts/migrate-users-to-sql.js
const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'localhost',
  user: 'int',
  password: '4Na9Gm8mdTVgnUp',
  database: 'labo',
};

async function migrate() {
  const usersPath = path.join(__dirname, '../data/users.json');
  const raw = await fs.readFile(usersPath, 'utf-8');
  const { users } = JSON.parse(raw);

  const connection = await mysql.createConnection(DB_CONFIG);

  for (const user of users) {
    // Vérifier si déjà présent (par email)
    const [rows] = await connection.execute('SELECT id FROM users WHERE email = ?', [user.email]);
    if (rows.length > 0) {
      
      continue;
    }
    await connection.execute(
      `INSERT INTO users (email, password, name, role, isActive, createdAt, updatedAt, siteConfig, associatedClasses, customClasses)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.email,
        user.password,
        user.name,
        user.role,
        user.isActive ? 1 : 0,
        user.createdAt.replace('T', ' ').slice(0, 19),
        user.updatedAt.replace('T', ' ').slice(0, 19),
        JSON.stringify(user.siteConfig || {}),
        JSON.stringify(user.associatedClasses || []),
        JSON.stringify(user.customClasses || [])
      ]
    );
    
  }

  await connection.end();
  
}

migrate().catch(e => { console.error(e); process.exit(1); });
