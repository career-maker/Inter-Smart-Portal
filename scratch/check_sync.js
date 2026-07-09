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
  let res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='biometric_sync_states'");
  console.log('Columns biometric_sync_states:', res.rows);
  await client.end();
}
run().catch(console.error);
