import { select, type PoolClient } from '@evershop/postgres-query-builder';
import { resolveDigitalFiles } from './downloadPolicy.js';

export async function getProductFiles(productId: number, connection: PoolClient) {
  const product = await select().from('product')
    .where('product_id', '=', productId).load(connection);
  if (!product) throw new Error('Product not found');
  const group = product.variant_group_id
    ? await select().from('variant_group')
      .where('variant_group_id', '=', product.variant_group_id).load(connection)
    : null;
  return resolveDigitalFiles(product.digital_files, group?.digital_files);
}
