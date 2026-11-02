// Run inside the candidate container before releasing traffic to it.
import { existsSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root = '/app/.evershop/build';
for (const route of ['storeSetting', 'adminLogin']) {
  const manifest = JSON.parse(readFileSync(`${root}/admin/${route}/client/index.json`, 'utf8'));
  for (const asset of [...manifest.js, ...manifest.css]) {
    const file = asset.replace(/^\/assets\//, `${root}/`);
    assert.ok(existsSync(file), `Missing ${route} asset: ${file}`);
  }
}
const admin = readFileSync(`${root}/admin/server/index.js`, 'utf8');
assert.ok(admin.includes('storeLanguages'), 'Missing additional language setting in SSR bundle');
assert.ok(admin.includes('Additional languages'), 'Missing additional language label');
assert.ok(existsSync(`${root}/frontStore/homepage/client/index.json`), 'Existing storefront build must remain intact');
console.log('LANGUAGE_RELEASE_ASSETS_OK');
