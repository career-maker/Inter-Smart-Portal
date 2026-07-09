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
  const res = await client.query(`
    SELECT source_table, source_event_id, received_at, employee_code, local_punch_time 
    FROM biometric_events 
    ORDER BY local_punch_time ASC 
    LIMIT 10
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

run().catch(console.error);
