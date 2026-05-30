/** /api/stripe?action=create-payment-intent|confirm-payment */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import createPaymentIntent from './stripe/create-payment-intent';
import confirmPayment from './stripe/confirm-payment';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String((req.query.action as string) || '').toLowerCase();
  switch (action) {
    case 'create-payment-intent': return createPaymentIntent(req, res);
    case 'confirm-payment':       return confirmPayment(req, res);
    default: return res.status(404).json({ error: 'Unknown stripe action', action });
  }
}
