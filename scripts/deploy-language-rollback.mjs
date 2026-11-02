// Restore only the language rows captured by deploy-enable-chinese.mjs.
import { readFileSync } from 'node:fs';
import pg from 'pg';
const rows = JSON.parse(readFileSync('/app/language-settings-before.json', 'utf8'));
const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
await client.connect();
try {
  await client.query('BEGIN');
  const previous = rows.find((row) => row.name === 'storeLanguages');
  if (previous) {
    await client.query('UPDATE setting SET value = $1, is_json = $2 WHERE name = $3', [previous.value, previous.is_json, previous.name]);
  } else {
    await client.query('DELETE FROM setting WHERE name = $1', ['storeLanguages']);
  }
  await client.query('COMMIT');
  console.log('LANGUAGE_SETTINGS_ROLLED_BACK');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
