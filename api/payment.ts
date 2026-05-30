// api/payment.ts
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE Vercel Serverless Function that routes ALL payment-gateway traffic.
//
// Why this exists:
//   Vercel Hobby plan caps deployments at 12 Serverless Functions.
//   Bundling every gateway action here consumes exactly ONE slot instead of ~11.
//
// How it works:
//   1. vercel.json rewrites  /api/<gateway>/<action>
//      →  /api/payment?gateway=<gateway>&action=<action>
//   2. This file reads those two query params and delegates to the original
//      handler modules (your gateway folders are UNTOUCHED).
//   3. The frontend never changes — it keeps calling /api/bkash/create-payment,
//      /api/sslcommerz/ipn, etc.
//
// Supported routes (auto-discovered from query params):
//   gateway=bkash      action=create-payment | execute-payment
//   gateway=nagad      action=create-payment | verify-payment
//   gateway=sslcommerz action=create-payment | ipn
//   gateway=razorpay   action=create-order   | verify-payment
//   gateway=paypal     action=create-order   | capture-order | callback
//   gateway=stripe     action=create-payment-intent | confirm-payment
// ─────────────────────────────────────────────────────────────────────────────

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Lazy-import map ──────────────────────────────────────────────────────────
// Each value is a () => Promise<handler> so that cold-start only loads the
// modules actually needed for this invocation.
type Handler = (req: VercelRequest, res: VercelResponse) => unknown;
type HandlerLoader = () => Promise<{ default: Handler }>;

const ROUTE_MAP: Record<string, Record<string, HandlerLoader>> = {
  bkash: {
    'create-payment':  () => import('./bkash/create-payment'),
    'execute-payment': () => import('./bkash/execute-payment'),
  },
  nagad: {
    'create-payment': () => import('./nagad/create-payment'),
    'verify-payment': () => import('./nagad/verify-payment'),
  },
  sslcommerz: {
    'create-payment': () => import('./sslcommerz/create-payment'),
    'ipn':            () => import('./sslcommerz/ipn'),
  },
  razorpay: {
    'create-order':   () => import('./razorpay/create-order'),
    'verify-payment': () => import('./razorpay/verify-payment'),
  },
  paypal: {
    'create-order':   () => import('./paypal/create-order'),
    'capture-order':  () => import('./paypal/capture-order'),
    'callback':       () => import('./paypal/callback'),
  },
  stripe: {
    'create-payment-intent': () => import('./stripe/create-payment-intent'),
    'confirm-payment':       () => import('./stripe/confirm-payment'),
  },
};

// ── Main router ──────────────────────────────────────────────────────────────
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // CORS pre-flight — propagated to all downstream handlers automatically
  // because we call them with the same req/res objects.
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.status(204).end();
    return;
  }

  const gateway = normalise(req.query.gateway);
  const action  = normalise(req.query.action);

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!gateway || !action) {
    res.status(400).json({
      error: 'Missing query parameters: gateway and action are required.',
      example: '/api/payment?gateway=sslcommerz&action=create-payment',
    });
    return;
  }

  const gatewayActions = ROUTE_MAP[gateway];
  if (!gatewayActions) {
    res.status(404).json({
      error: `Unknown gateway: "${gateway}"`,
      available: Object.keys(ROUTE_MAP),
    });
    return;
  }

  const loader = gatewayActions[action];
  if (!loader) {
    res.status(404).json({
      error: `Unknown action "${action}" for gateway "${gateway}"`,
      available: Object.keys(gatewayActions),
    });
    return;
  }

  // ── Delegate to the original handler ───────────────────────────────────────
  try {
    const module = await loader();
    await module.default(req, res);
  } catch (err: any) {
    console.error(`[payment-router] ${gateway}/${action} threw:`, err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message ?? 'Internal server error' });
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Safely coerce a VercelRequest query value to a plain lowercase string.
 * Handles string | string[] | undefined coming from req.query.
 */
function normalise(value: string | string[] | undefined): string {
  if (!value) return '';
  const str = Array.isArray(value) ? value[0] : value;
  return str.trim().toLowerCase();
}
