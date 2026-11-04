import { insert, select, type PoolClient } from '@evershop/postgres-query-builder';
import { getProductFiles } from './productFiles.js';

/** Runs on the order transaction, before commit. Nothing is granted to guests. */
export async function snapshotDownloads(orderId: number, connection: PoolClient) {
  const order = await select().from('order').where('order_id', '=', orderId).load(connection);
  const items = await select().from('order_item')
    .where('order_item_order_id', '=', orderId).execute(connection);
  for (const item of items) {
    const files = await getProductFiles(item.product_id, connection);
    if (!files.length) continue;
    if (!order.customer_id) throw new Error('Please sign in to purchase digital products');
    const bucket = process.env.DIGITAL_S3_BUCKET;
    if (!bucket) throw new Error('Digital delivery storage is not configured');
    for (const file of files) {
      await insert('digital_download').given({
        order_item_id: item.order_item_id,
        bucket,
        object_key: file.key,
        version_id: file.versionId,
        name: file.name
      }).execute(connection);
    }
  }
}
