import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'int',
  password: process.env.DB_PASSWORD || '4Na9Gm8mdTVgnUp',
  database: process.env.DB_NAME || 'labo'
});

try {
  const [tables] = await connection.execute("SHOW TABLES LIKE '%room%'");
  console.log('Tables room:', tables);
  
  if (tables.length > 0) {
    const [roomsData] = await connection.execute('SELECT * FROM rooms LIMIT 5');
    console.log('Données rooms:', roomsData);
    
    const [locationsData] = await connection.execute('SELECT * FROM room_locations LIMIT 5');
    console.log('Données room_locations:', locationsData);
  }
} catch (error) {
  console.error('Erreur:', error);
} finally {
  await connection.end();
}
