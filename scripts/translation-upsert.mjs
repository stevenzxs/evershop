// Upsert one content translation row. The translationdb module's refresher
// picks the change up within ~30s — no restart needed.
//
// Usage (inside the evershop container):
//   node /app/scripts/translation-upsert.mjs <locale> <source> <target>
//   node /app/scripts/translation-upsert.mjs zh "New Category" "新分类"
//
// Delete a translation by passing an empty target? No — deleting is a
// conscious DB operation (DELETE FROM translation_override WHERE ...).
import pg from 'pg';

const [locale, source, target] = process.argv.slice(2);
if (!locale || !source || !target) {
  console.error(
    'Usage: translation-upsert.mjs <locale> <source> <target>\n' +
      'Example: translation-upsert.mjs zh "New Category" "新分类"'
  );
  process.exit(1);
}

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
await client.connect();
try {
  await client.query(
    `INSERT INTO translation_override (locale, source, target)
     VALUES ($1, $2, $3)
     ON CONFLICT ON CONSTRAINT "TRANSLATION_OVERRIDE_LOCALE_SOURCE_UNIQUE"
     DO UPDATE SET target = EXCLUDED.target, updated_at = now()`,
    [locale, source, target]
  );
  console.log(
    `Upserted [${locale}] "${source}" -> "${target}". ` +
      'Live within ~30s (refresher interval), no restart needed.'
  );
} finally {
  await client.end();
}
