const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'chama_db'
});

async function runSchema() {
  try {
    console.log('Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('✓ Connected to PostgreSQL');

    // Read the schema file
    const schema = fs.readFileSync('./src/config/schema.sql', 'utf8');
    
    console.log('Running schema...');
    await client.query(schema);
    console.log('✓ Schema executed successfully!');

    // Verify tables were created
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n✓ Tables created:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    client.release();
    await pool.end();
    console.log('\n✓ Database setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('✗ Error setting up database:', err.message);
    process.exit(1);
  }
}

runSchema();
