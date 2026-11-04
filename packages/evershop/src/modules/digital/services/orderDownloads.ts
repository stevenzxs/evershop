import { pool } from '../../../lib/postgres/connection.js';
import { signDownload } from './digitalStorage.js';
import { canDownload } from './downloadPolicy.js';

export async function listOrderDownloads(orderUuid: string, customerId: number) {
  const result = await pool.query(
    `SELECT d.id, d.name, d.disabled, o.customer_id, o.payment_status, o.status,
       i.product_name FROM digital_download d
     JOIN order_item i ON i.order_item_id = d.order_item_id
     JOIN "order" o ON o.order_id = i.order_item_order_id
     WHERE o.uuid = $1 AND o.customer_id = $2 ORDER BY d.created_at, d.id`,
    [orderUuid, customerId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    productName: row.product_name,
    available: canDownload(row, customerId, row.disabled)
  }));
}

export async function issueOrderDownload(id: string, customerId: number) {
  // Atomic per-file cooldown survives restarts and concurrent requests. Recheck
  // ownership/payment inside the UPDATE; never rely on the buyer's UI state.
  const result = await pool.query(
    `UPDATE digital_download d
     SET last_issued_at = now(), issued_count = issued_count + 1
     FROM order_item i, "order" o
     WHERE d.id = $1 AND i.order_item_id = d.order_item_id
       AND o.order_id = i.order_item_order_id AND o.customer_id = $2
       AND o.payment_status = 'paid' AND o.status NOT IN ('canceled', 'cancelled')
       AND d.disabled = false
       AND (d.last_issued_at IS NULL OR d.last_issued_at < now() - interval '5 seconds')
     RETURNING d.*`,
    [id, customerId]
  );
  if (!result.rows[0]) return null;
  return signDownload(result.rows[0]);
}
