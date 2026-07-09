const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.shczwbwsrnrygmmvyeue',
  password: 'Abhihere1234@',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT COUNT(*) FROM biometric_events");
  console.log('Count:', res.rows[0].count);
  await client.end();
}
run().catch(console.error);
