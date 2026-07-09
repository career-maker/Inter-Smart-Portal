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
  let res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log('Tables:', res.rows.map(x=>x.table_name).join(', '));
  
  res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='biometric_events'");
  console.log('Columns biometric_events:', res.rows);
  
  await client.end();
}
run().catch(console.error);
