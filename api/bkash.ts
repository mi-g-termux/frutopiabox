/**
 * Vercel Serverless Function: /api/bkash?action=<create-payment|execute-payment>
 *
 * Consolidated dispatcher — kept as ONE function file so the project stays
 * under Vercel Hobby's 12-function limit. The original handler implementations
 * live in api/_bkash/* (the leading underscore tells Vercel to skip them
 * as standalone functions).
 *
 * vercel.json rewrites /api/bkash/:action -> /api/bkash?action=:action so
 * existing client URLs keep working unchanged.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import createPayment from './bkash/create-payment';
import executePayment from './bkash/execute-payment';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String((req.query.action as string) || '').toLowerCase();
  switch (action) {
    case 'create-payment':  return createPayment(req, res);
    case 'execute-payment': return executePayment(req, res);
    default:
      return res.status(404).json({ error: 'Unknown bkash action', action });
  }
}
