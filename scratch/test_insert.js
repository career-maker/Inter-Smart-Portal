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
  
  const sql = `INSERT INTO biometric_events 
    (source_system, source_table, source_event_id, employee_code, user_id, device_id, direction, local_punch_time, source_timezone, utc_punch_time, mapping_status, processing_status, created_at, updated_at) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
    ON CONFLICT (source_system, source_table, source_event_id) DO NOTHING 
    RETURNING source_system, source_table, source_event_id`;
    
  const params = [
    'essl',
    'DeviceLogs_6_2026',
    '12793',
    'EMP001',
    null,
    '19',
    'out',
    '2026-06-29 10:36:49',
    'Asia/Kolkata',
    '2026-06-29 05:06:49',
    'unmapped',
    'pending',
    '2026-07-06 10:00:00',
    '2026-07-06 10:00:00'
  ];
  
  try {
      const res = await client.query('BEGIN');
      const insertRes = await client.query(sql, params);
      console.log('Insert success:', insertRes.rows);
      await client.query('ROLLBACK');
  } catch (err) {
      console.error('Insert error:', err);
  }
  
  await client.end();
}
run().catch(console.error);
