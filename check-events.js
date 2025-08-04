import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'int',
  password: process.env.DB_PASSWORD || '4Na9Gm8mdTVgnUp',
  database: process.env.DB_NAME || 'labo'
});

try {
  const [events] = await connection.execute('SELECT id, title, room FROM calendar_physique WHERE room IS NOT NULL AND room != "" LIMIT 3');
  console.log('Événements physique avec room:', events);
  
  const [events2] = await connection.execute('SELECT id, title, room FROM calendar_chimie WHERE room IS NOT NULL AND room != "" LIMIT 3');
  console.log('Événements chimie avec room:', events2);
} catch (error) {
  console.error('Erreur:', error);
} finally {
  await connection.end();
}
