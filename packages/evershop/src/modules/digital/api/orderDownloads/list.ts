import { listOrderDownloads } from '../../services/orderDownloads.js';

export default async (request, response, next) => {
  response.set('Cache-Control', 'private, no-store');
  const customer = request.getCurrentCustomer();
  if (!customer) return response.status(401).json({ error: { message: 'Sign in required' } });
  if (!/^[a-f0-9-]{32,36}$/i.test(request.params.uuid)) {
    return response.status(404).json({ error: { message: 'Order not found' } });
  }
  try {
    const data = await listOrderDownloads(request.params.uuid, customer.customer_id);
    return response.json({ data });
  } catch {
    return response.status(503).json({ error: { message: 'Downloads are temporarily unavailable' } });
  }
};
