import assert from 'node:assert/strict';
import { test } from 'node:test';

function responseStub() {
  return {
    statusCode: 200, body: null,
    set() { return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('customer routes deny unauthenticated requests without querying the database', async () => {
  for (const [route, handler] of [['orderDownloads', 'list'], ['digitalDownload', 'issue']]) {
    const { default: middleware } = await import(`../../packages/evershop/dist/modules/digital/api/${route}/${handler}.js`);
    const response = responseStub();
    await middleware({ getCurrentCustomer: () => null }, response, () => assert.fail('must not auto-next'));
    assert.equal(response.statusCode, 401);
  }
});

test('download issuance denies cross-site form requests before any database access', async () => {
  const { default: issue } = await import('../../packages/evershop/dist/modules/digital/api/digitalDownload/issue.js');
  const response = responseStub();
  await issue({ getCurrentCustomer: () => ({ customer_id: 42 }), get: () => undefined }, response, () => {});
  assert.equal(response.statusCode, 403);
});

for (const [route, handler] of [
  ['orderDownloads', 'list'],
  ['digitalDownload', 'issue'],
  ['digitalProductFiles', 'files'],
  ['disableDigitalDownloads', 'disable']
]) {
  test(`${route} uses active middleware so the framework does not send a second response`, async () => {
    const { default: middleware } = await import(
      `../../packages/evershop/dist/modules/digital/api/${route}/${handler}.js`
    );
    assert.equal(middleware.length, 3);
  });
}
