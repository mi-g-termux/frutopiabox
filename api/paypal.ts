/** /api/paypal?action=create-order|capture-order|callback */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import createOrder from './_paypal/create-order';
import captureOrder from './_paypal/capture-order';
import callback from './_paypal/callback';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String((req.query.action as string) || '').toLowerCase();
  switch (action) {
    case 'create-order':  return createOrder(req, res);
    case 'capture-order': return captureOrder(req, res);
    case 'callback':      return callback(req, res);
    default: return res.status(404).json({ error: 'Unknown paypal action', action });
  }
}
