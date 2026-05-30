/** /api/razorpay?action=create-order|verify-payment */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import createOrder from './_razorpay/create-order';
import verifyPayment from './_razorpay/verify-payment';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String((req.query.action as string) || '').toLowerCase();
  switch (action) {
    case 'create-order':   return createOrder(req, res);
    case 'verify-payment': return verifyPayment(req, res);
    default: return res.status(404).json({ error: 'Unknown razorpay action', action });
  }
}
