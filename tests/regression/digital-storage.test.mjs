import assert from 'node:assert/strict';
import { test } from 'node:test';
import { digitalStorageConfig, signDownload } from '../../packages/evershop/dist/modules/digital/services/digitalStorage.js';

test('digital signing uses a public HTTPS endpoint and separate credentials', () => {
  const env = {
    DIGITAL_S3_BUCKET: 'private-files', DIGITAL_S3_ENDPOINT: 'http://silo:9000',
    DIGITAL_S3_PUBLIC_ENDPOINT: 'https://media.example.com',
    DIGITAL_S3_ACCESS_KEY_ID: 'delivery', DIGITAL_S3_SECRET_ACCESS_KEY: 'secret'
  };
  assert.equal(digitalStorageConfig(env).publicEndpoint, 'https://media.example.com');
  for (const key of Object.keys(env)) {
    assert.throws(() => digitalStorageConfig({ ...env, [key]: '' }));
  }
  assert.throws(() => digitalStorageConfig({ ...env, DIGITAL_S3_PUBLIC_ENDPOINT: 'http://silo:9000' }));
  assert.throws(() => digitalStorageConfig({ ...env, DIGITAL_S3_PUBLIC_ENDPOINT: 'https://media.example.com/path' }));
});

test('presigning pins object version and signs the real public host for five minutes', async () => {
  const values = {
    DIGITAL_S3_BUCKET: 'private-files', DIGITAL_S3_ENDPOINT: 'http://silo:9000',
    DIGITAL_S3_PUBLIC_ENDPOINT: 'https://media.example.com',
    DIGITAL_S3_ACCESS_KEY_ID: 'delivery', DIGITAL_S3_SECRET_ACCESS_KEY: 'test-secret'
  };
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  try {
    const url = new URL(await signDownload({ bucket: 'private-files', object_key: 'products/a.zip', version_id: 'immutable-v1', name: '资料.zip' }));
    assert.equal(url.origin, 'https://media.example.com');
    assert.equal(url.pathname, '/private-files/products/a.zip');
    assert.equal(url.searchParams.get('versionId'), 'immutable-v1');
    assert.equal(url.searchParams.get('X-Amz-Expires'), '300');
    assert.ok(url.searchParams.get('X-Amz-SignedHeaders').split(';').includes('host'));
    assert.ok(url.searchParams.get('X-Amz-Signature'));
    assert.match(url.searchParams.get('response-content-disposition'), /^attachment;/);
    await assert.rejects(signDownload({ bucket: 'public-images', object_key: 'a.zip', version_id: 'v1', name: 'a.zip' }));
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
