/** /api/sslcommerz?action=create-payment|ipn */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import createPayment from './_sslcommerz/create-payment';
import ipn from './_sslcommerz/ipn';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String((req.query.action as string) || '').toLowerCase();
  switch (action) {
    case 'create-payment': return createPayment(req, res);
    case 'ipn':            return ipn(req, res);
    default: return res.status(404).json({ error: 'Unknown sslcommerz action', action });
  }
}
