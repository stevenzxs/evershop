import { issueOrderDownload } from '../../services/orderDownloads.js';

export default async (request, response, next) => {
  response.set('Cache-Control', 'private, no-store');
  const customer = request.getCurrentCustomer();
  if (!customer) return response.status(401).json({ error: { message: 'Sign in required' } });
  if (request.get('X-Digital-Request') !== '1') {
    return response.status(403).json({ error: { message: 'Invalid download request' } });
  }
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(request.params.id)) {
    return response.status(404).json({ error: { message: 'Download unavailable' } });
  }
  try {
    const url = await issueOrderDownload(request.params.id, customer.customer_id);
    if (!url) return response.status(403).json({ error: { message: 'Download unavailable; confirm payment or try again shortly' } });
    return response.json({ data: { url, expiresIn: 300 } });
  } catch {
    return response.status(503).json({ error: { message: 'Downloads are temporarily unavailable' } });
  }
};
