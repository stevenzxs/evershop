import { pool } from '../../../../lib/postgres/connection.js';

export default async (request, response, next) => {
  if (request.get('X-Digital-Request') !== '1') return response.status(403).json({ error: { message: 'Invalid request' } });
  if (!/^[a-f0-9-]{32,36}$/i.test(request.params.uuid)) return response.status(404).json({ error: { message: 'Order not found' } });
  await pool.query(`UPDATE digital_download d SET disabled = true
    FROM order_item i, "order" o WHERE i.order_item_id = d.order_item_id
      AND o.order_id = i.order_item_order_id AND o.uuid = $1`, [request.params.uuid]);
  response.set('Cache-Control', 'no-store');
  return response.json({ data: { disabled: true } });
};
