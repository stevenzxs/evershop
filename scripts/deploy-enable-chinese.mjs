// Run in the release container; credentials stay in the container environment.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import pg from 'pg';

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
  const { rows } = await client.query(
    'SELECT * FROM setting WHERE name IN ($1, $2) FOR UPDATE',
    ['storeLanguage', 'storeLanguages']
  );
  const backup = '/app/language-settings-before.json';
  const snapshot = JSON.stringify(rows, null, 2);
  if (existsSync(backup)) {
    if (readFileSync(backup, 'utf8') !== snapshot) throw new Error('Settings changed since backup; review before retry');
  } else {
    writeFileSync(backup, snapshot, { flag: 'wx', mode: 0o600 });
  }
  const row = rows.find((entry) => entry.name === 'storeLanguages');
  const parsed = row ? JSON.parse(row.value || '[]') : [];
  if (!Array.isArray(parsed)) throw new Error('Existing additional languages are not an array');
  const additional = [...new Set([...parsed, 'zh'])];
  await client.query(
    'INSERT INTO setting (name, value, is_json) VALUES ($1, $2, TRUE) ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, is_json = TRUE',
    ['storeLanguages', JSON.stringify(additional)]
  );
  await client.query('COMMIT');
  console.log(JSON.stringify({ additionalLanguages: additional, defaultLanguageChanged: false }));
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
