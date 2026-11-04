import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

test('cart item query actually loads the shipping flag used by both contexts', () => {
  const source = readFileSync(new URL('../../packages/evershop/src/modules/base/pages/frontStore/all/Base.tsx', import.meta.url), 'utf8');
  const fragment = source.match(/fragment ShoppingCartItem on ShoppingCartItem \{([\s\S]*?)\n  \}/)?.[1];
  assert.match(fragment, /\bnoShippingRequired\b/);
});

// These contexts import browser/webpack aliases. Extract the two tiny callbacks
// to verify their actual implementation without booting a storefront bundle.
function shippingCallback(file, name) {
  const source = readFileSync(new URL(`../../packages/evershop/src/components/frontStore/${file}`, import.meta.url), 'utf8');
  const body = source.match(new RegExp(`const ${name} = use(?:Memo|Callback)\\(\\(\\) => \\{([\\s\\S]*?)\\}, \\[`))?.[1];
  assert.ok(body, `missing ${name} callback`);
  return new Function('state', 'cartState', body);
}

for (const [file, callback] of [
  ['cart/CartContext.tsx', 'isShippingRequired'],
  ['checkout/CheckoutContext.tsx', 'requiresShipment']
]) {
  test(`${callback} handles empty, virtual-only, physical and mixed carts`, () => {
    const check = shippingCallback(file, callback);
    for (const [items, expected] of [
      [[], false],
      [[{ noShippingRequired: true }], false],
      [[{ noShippingRequired: false }], true],
      [[{}], true],
      [[{ noShippingRequired: true }, { noShippingRequired: false }], true]
    ]) {
      const state = { data: { items } };
      assert.equal(check(state, state), expected);
    }
  });
}
