import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@/db/schema';
import ws from 'ws';

// Configure WebSocket for Node.js environment (EC2/PM2)
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Please add it to your environment variables.');
}

const databaseUrl = process.env.DATABASE_URL;

// Create Pool with sane max connections for PM2 cluster mode
const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 10, // Max connections per process
});

export const db = drizzle({ client: pool, schema });
export * from '@/db/schema';
