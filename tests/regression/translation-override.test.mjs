import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeOverrides } from '../../packages/evershop/dist/modules/translationdb/bootstrap.js';
import { addProcessor, getValue } from '../../packages/evershop/dist/lib/util/registry.js';

test('mergeOverrides lets DB rows win over the disk base', () => {
  const base = { Hello: '你好', Keep: '保留' };
  const merged = mergeOverrides(base, [
    { source: 'Hello', target: '您好' },
    { source: 'New', target: '新的' }
  ]);
  assert.equal(merged.Hello, '您好');
  assert.equal(merged.New, '新的');
  assert.equal(merged.Keep, '保留');
  // base object must not be mutated
  assert.equal(base.Hello, '你好');
});

test('mergeOverrides skips empty rows instead of blanking translations', () => {
  const merged = mergeOverrides({ A: '甲' }, [
    { source: '', target: 'x' },
    { source: 'A', target: '' },
    { source: 'B', target: '乙' }
  ]);
  assert.deepEqual(merged, { A: '甲', B: '乙' });
});

test('localeDictionary processors re-run on every build (registry cache defeated by nonce)', async () => {
  let calls = 0;
  addProcessor('localeDictionary', async function (base) {
    calls += 1;
    return { ...base, Marker: 'yes' };
  });
  const { composeLocaleDictionary } = await import(
    '../../packages/evershop/dist/lib/locale/dictionary.js'
  );
  const first = await composeLocaleDictionary('zh', {});
  const second = await composeLocaleDictionary('zh', {});
  assert.equal(calls, 2, 'processor must run on every dictionary build, not just the first');
  assert.equal(first.Marker, 'yes');
  assert.equal(second.Marker, 'yes');
});
