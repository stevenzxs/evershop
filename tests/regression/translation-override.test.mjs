import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeOverrides } from '../packages/evershop/dist/modules/translationdb/bootstrap.js';

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
