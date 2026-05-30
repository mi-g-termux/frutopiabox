/** /api/nagad?action=create-payment|verify-payment */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import createPayment from './_nagad/create-payment';
import verifyPayment from './_nagad/verify-payment';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String((req.query.action as string) || '').toLowerCase();
  switch (action) {
    case 'create-payment': return createPayment(req, res);
    case 'verify-payment': return verifyPayment(req, res);
    default: return res.status(404).json({ error: 'Unknown nagad action', action });
  }
}
