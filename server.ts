/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;

  // --- API ROUTE: HEALTH CHECK ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', time: new Date().toISOString() });
  });

  // --- API ROUTE: SEND SMTP EMAIL & GENERATE INVOICE MAIL ---
  app.post('/api/send-email', async (req: express.Request, res: express.Response) => {
    const { to, subject, html, smtpSettings } = req.body;

    if (!to || !subject || !html) {
      res.status(400).json({ error: 'Missing parameter: to, subject, or html body is required.' });
      return;
    }

    console.log(`[EMAIL DISPATCH] To: ${to} | Subject: "${subject}"`);

    const smtp = smtpSettings || { isEnabled: false };

    if (smtp.isEnabled && smtp.host && smtp.port && smtp.email) {
      try {
        console.log(`[SMTP] Attempting connection to ${smtp.host}:${smtp.port} using user ${smtp.email}`);
        
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: Number(smtp.port),
          secure: Number(smtp.port) === 465,
          auth: {
            user: smtp.email,
            pass: smtp.password || '',
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        const mailOptions = {
          from: `"Quirky Fruity Store" <${smtp.email}>`,
          to,
          subject,
          html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[SMTP] Real Email sent successfully! MessageID:', info.messageId);
        res.json({ success: true, message: 'SMTP email sent successfully.', messageId: info.messageId });
        return;
      } catch (err: any) {
        console.error('[SMTP ERROR] Failed to send real email. Falling back to log print.', err);
        res.json({
          success: true,
          warn: true,
          message: `Attempted real email via SMTP, but failed: ${err.message}. Printed email content to server log instead.`,
          logSimulated: true
        });
        return;
      }
    } else {
      console.log('================================================================');
      console.log(`[SIMULATED EMAIL DISPATCH] (SMTP is not enabled in settings)`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`--- Email HTML Content ---`);
      console.log(html);
      console.log('================================================================');

      res.json({
        success: true,
        message: 'Email simulated and printed to terminal successfully. (Configure SMTP in settings to send real emails!)',
        simulated: true
      });
      return;
    }
  });

  // ==========================================================================
  //  DYNAMIC PAYMENT ROUTER FOR ALL GATEWAYS (Render.com Free Plan Support)
  // ==========================================================================
  // এটি bKash, Nagad, SSLCommerz, PayPal, Razorpay, Stripe সবকিছুর জন্য কাজ করবে।
  // ফ্রন্টএন্ড যখনই /api/sslcommerz/create-payment বা /api/bkash/callback এ হিট করবে, 
  // এটি সেই রিকোয়েস্টটি ধরে আপনার সেন্ট্রাল payment.ts রাউটারে পাঠিয়ে দেবে।
  
  app.all('/api/:gateway/:action', async (req: express.Request, res: express.Response) => {
    const { gateway, action } = req.params;
    
    // Vercel এর মত কুয়েরি প্যারামিটার সেট করা হচ্ছে যাতে payment.ts ফাইলটি পড়তে পারে
    req.query.gateway = gateway;
    req.query.action = action;

    console.log(`[PAYMENT ROUTER] Routing request for Gateway: ${gateway} | Action: ${action}`);

    try {
      // আপনার তৈরি করা নতুন api/payment.ts ফাইলটি রানটাইমে ইম্পোর্ট করা হচ্ছে
      const paymentRouter = await import('./api/payment.js');
      
      if (typeof paymentRouter.default === 'function') {
        return paymentRouter.default(req, res);
      }
      
      res.status(500).json({ error: 'Central payment router handler function not found.' });
    } catch (err: any) {
      console.error(`[Router Error] Failed to route to /api/${gateway}/${action}:`, err);
      res.status(500).json({ error: `Internal Routing Error: ${err.message}` });
    }
  });

  // পুরোনো মেথডগুলোও ব্যাকআপ হিসেবে রাখা হলো যেন কোনো ব্যাকওয়ার্ড লিংক ভেঙে না যায়
  app.post('/api/bkash/create-payment', async (req: express.Request, res: express.Response) => {
    try {
      const paymentRouter = await import('./api/payment.js');
      req.query.gateway = 'bkash';
      req.query.action = 'create-payment';
      if (typeof paymentRouter.default === 'function') return paymentRouter.default(req, res);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/bkash/callback', async (req: express.Request, res: express.Response) => {
    try {
      const paymentRouter = await import('./api/payment.js');
      req.query.gateway = 'bkash';
      req.query.action = 'callback';
      if (typeof paymentRouter.default === 'function') return paymentRouter.default(req, res);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/nagad/create-payment', async (req: express.Request, res: express.Response) => {
    try {
      const paymentRouter = await import('./api/payment.js');
      req.query.gateway = 'nagad';
      req.query.action = 'create-payment';
      if (typeof paymentRouter.default === 'function') return paymentRouter.default(req, res);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/nagad/callback', async (req: express.Request, res: express.Response) => {
    try {
      const paymentRouter = await import('./api/payment.js');
      req.query.gateway = 'nagad';
      req.query.action = 'callback';
      if (typeof paymentRouter.default === 'function') return paymentRouter.default(req, res);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  //  VITE / FRONTEND SERVING
  // ==========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OK] Full-Stack Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('[CRITICAL] Server startup error:', error);
});