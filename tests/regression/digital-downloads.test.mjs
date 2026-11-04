import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validateDigitalFiles,
  resolveDigitalFiles,
  canDownload
} from '../../packages/evershop/dist/modules/digital/services/downloadPolicy.js';

const files = [{ name: 'Package.zip', key: 'products/a.zip', versionId: 'v1' }];

test('file bindings require immutable versions and canonical object keys', () => {
  assert.deepEqual(validateDigitalFiles(files), files);
  for (const key of ['../secret', '/secret', 'a//b', 'a/./b', 'a/../b', 'a/']) {
    assert.throws(() => validateDigitalFiles([{ ...files[0], key }]));
  }
  for (const versionId of ['', 'null', undefined]) {
    assert.throws(() => validateDigitalFiles([{ ...files[0], versionId }]));
  }
  assert.throws(() => validateDigitalFiles([{ ...files[0], name: 'bad\r\n.zip' }]));
  assert.throws(() => validateDigitalFiles([{ ...files[0], key: 'a\\b' }]));
});

test('variant bindings distinguish inherit from an empty explicit override', () => {
  assert.deepEqual(resolveDigitalFiles(null, files), files);
  assert.deepEqual(resolveDigitalFiles([], files), []);
  const override = [{ ...files[0], versionId: 'v2' }];
  assert.deepEqual(resolveDigitalFiles(override, files), override);
});

test('downloads require a paid order owned by a logged-in buyer', () => {
  const order = { customer_id: 42, payment_status: 'paid', status: 'completed' };
  assert.equal(canDownload(order, 42, false), true);
  assert.equal(canDownload(order, 41, false), false);
  assert.equal(canDownload(order, null, false), false);
  assert.equal(canDownload({ ...order, customer_id: null }, null, false), false);
  for (const payment_status of ['pending', 'authorized', 'refunded', 'failed']) {
    assert.equal(canDownload({ ...order, payment_status }, 42, false), false);
  }
  assert.equal(canDownload(order, 42, true), false);
  assert.equal(canDownload({ ...order, status: 'canceled' }, 42, false), false);
});
