import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  localizeLink,
  setSSRContext
} from '../../packages/evershop/dist/lib/locale/activeDictionary.js';

const ZH = { locale: 'zh', defaultLocale: 'en', isAdmin: false };
const RESET = { locale: '', defaultLocale: '', isAdmin: false };

test('localizeLink prefixes internal paths for a non-default locale', () => {
  setSSRContext(ZH, {});
  try {
    assert.equal(localizeLink('/websites'), '/zh/websites');
    assert.equal(localizeLink('/'), '/zh');
    // never double-prefix
    assert.equal(localizeLink('/zh/websites'), '/zh/websites');
    assert.equal(localizeLink('/zh'), '/zh');
    // external / non-page links pass through
    assert.equal(localizeLink('https://example.com/a'), 'https://example.com/a');
    assert.equal(localizeLink('//cdn.example.com/a'), '//cdn.example.com/a');
    assert.equal(localizeLink('#top'), '#top');
    assert.equal(localizeLink('mailto:a@b.c'), 'mailto:a@b.c');
    // API paths are never prefixed
    assert.equal(localizeLink('/api/cart'), '/api/cart');
  } finally {
    setSSRContext(RESET, {});
  }
});

test('localizeLink is a no-op for the default locale and empty context', () => {
  setSSRContext({ locale: 'en', defaultLocale: 'en', isAdmin: false }, {});
  try {
    assert.equal(localizeLink('/websites'), '/websites');
  } finally {
    setSSRContext(RESET, {});
  }
  assert.equal(localizeLink('/websites'), '/websites');
});
