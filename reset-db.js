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

async function resetDatabase() {
  try {
    console.log('Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('✓ Connected to PostgreSQL');

    console.log('\n⚠️  Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS withdrawals CASCADE;
      DROP TABLE IF EXISTS deposits CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('✓ Tables dropped');

    // Read the schema file
    const schema = fs.readFileSync('./src/config/schema.sql', 'utf8');
    
    console.log('\nCreating new schema...');
    await client.query(schema);
    console.log('✓ Schema created successfully!');

    // Verify tables were created
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n✓ Tables created:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Verify columns in users table
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    
    console.log('\n✓ Users table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    client.release();
    await pool.end();
    console.log('\n✓ Database reset complete! Ready to register users.');
    process.exit(0);
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

resetDatabase();
