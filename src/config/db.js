const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_strong_password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'chama_db'
});

pool.on('connect', () => {
  console.log('Successfully connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Database Connection Error: ', err.message);
});

module.exports = pool;
