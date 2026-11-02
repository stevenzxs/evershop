import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const page = readFileSync(
  new URL('../../packages/evershop/src/modules/setting/pages/admin/storeSetting/StoreSetting.tsx', import.meta.url),
  'utf8'
);
// JSX comments do not produce controls, even if their text contains a field name.
const activePage = page.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

test('store settings expose the additional-language multi-select', () => {
  const field = activePage.match(/<ReactSelectField\b[^>]*name="storeLanguages"[^>]*\/>/s)?.[0];
  assert.ok(field, 'Additional languages must be an active ReactSelectField, not a JSX comment');
  assert.match(field, /\bisMulti\b/);
  assert.match(field, /defaultValue=\{storeLanguages\}/);
  assert.match(field, /options=\{additionalOptions\}/);
});

test('default and admin languages remain separate settings', () => {
  assert.match(activePage, /name="storeLanguage"/);
  assert.match(activePage, /name="adminLanguage"/);
  assert.match(activePage, /options\.filter\(\(o\) => o\.value !== storeLanguage\)/);
});
