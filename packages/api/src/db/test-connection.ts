import 'dotenv/config';
import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function testConnection() {
  const start = Date.now();
  console.log('Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

  try {
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('DB connected in', Date.now() - start, 'ms');
    console.log('Result:', result);
    process.exit(0);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('DB error after', Date.now() - start, 'ms:', errorMessage);
    process.exit(1);
  }
}

testConnection();
