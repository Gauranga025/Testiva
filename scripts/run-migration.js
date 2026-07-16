require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');
const fs = require('fs');
const path = require('path');

// Configure WebSocket for Node.js environment
const { neonConfig } = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  console.error('Make sure you have a .env file with DATABASE_URL set');
  process.exit(1);
}

const migrationPath = path.join(__dirname, '../drizzle/0003_fix_foreign_keys.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

async function runMigration() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Starting migration...');
    
    // Split by statement breakpoints and execute each statement
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await pool.query(statement);
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
