import { pool } from '../../../../lib/postgres/connection.js';
import { verifyDigitalFiles } from '../../services/digitalStorage.js';
import { validateDigitalFiles } from '../../services/downloadPolicy.js';

export default async (request, response, next) => {
  response.set('Cache-Control', 'private, no-store');
  if (!/^\d+$/.test(request.params.id)) return response.status(404).json({ error: { message: 'Product not found' } });
  try {
    const result = await pool.query('SELECT product_id, variant_group_id, digital_files FROM product WHERE product_id = $1', [request.params.id]);
    const product = result.rows[0];
    if (!product) return response.status(404).json({ error: { message: 'Product not found' } });
    const groupResult = product.variant_group_id
      ? await pool.query('SELECT digital_files FROM variant_group WHERE variant_group_id = $1', [product.variant_group_id])
      : { rows: [] };
    if (request.method === 'GET') {
      return response.json({ data: { files: product.digital_files, groupFiles: groupResult.rows[0]?.digital_files ?? null, hasGroup: !!product.variant_group_id } });
    }
    if (request.get('X-Digital-Request') !== '1') return response.status(403).json({ error: { message: 'Invalid request' } });
    const { scope, files } = request.body ?? {};
    if (!['product', 'group'].includes(scope) || files === undefined || (scope === 'group' && !product.variant_group_id)) {
      return response.status(422).json({ error: { message: 'Invalid digital file binding' } });
    }
    const validated = files === null ? null : validateDigitalFiles(files);
    await verifyDigitalFiles(validated ?? []);
    // Table/column names are selected only from these two fixed statements.
    if (scope === 'group') {
      await pool.query('UPDATE variant_group SET digital_files = $1::jsonb WHERE variant_group_id = $2', [validated === null ? null : JSON.stringify(validated), product.variant_group_id]);
    } else {
      await pool.query('UPDATE product SET digital_files = $1::jsonb WHERE product_id = $2', [validated === null ? null : JSON.stringify(validated), product.product_id]);
    }
    return response.json({ data: { saved: true } });
  } catch {
    return response.status(422).json({ error: { message: 'Could not save digital files. Check file names, object keys, version IDs and storage configuration.' } });
  }
};
