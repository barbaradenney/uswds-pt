import 'dotenv/config';
import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function testConnection() {
  const start = Date.now();
  console.log('Testing database connection...');
  // Note: Never log DATABASE_URL as it may contain credentials

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
