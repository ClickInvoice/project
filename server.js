const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(express.json());

// Middleware to generate a nonce and set CSP headers
app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  const shop = req.query.shop || '';
  let frameAncestors = "frame-ancestors 'self'";

  if (shop && shop.endsWith('myshopify.com')) {
    frameAncestors += ` https://${shop}`;
  }

  const csp = [
    "default-src 'self'",
    `script-src 'strict-dynamic' 'nonce-${nonce}' 'unsafe-inline' http: https:`,
    "object-src 'none'",
    "base-uri 'none'",
    "require-trusted-types-for 'script'",
    frameAncestors,
    "report-uri https://clickinvoice.netlify.app/.Netlify/csp-report"
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);
  res.locals.nonce = nonce;

  next();
});

// Shopify OAuth callback endpoint
app.post('/api/shopify/callback', async (req, res) => {
  const { code, shop } = req.body;
  const API_KEY = process.env.SHOPIFY_API_KEY;
  const API_SECRET = process.env.SHOPIFY_API_SECRET;

  try {
    const response = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: API_KEY,
      client_secret: API_SECRET,
      code
    });

    const accessToken = response.data.access_token;
    res.json({ accessToken });
  } catch (error) {
    console.error('Error exchanging code for access token:', error);
    res.status(500).send('Authentication error');
  }
});

// Serve the app from a specific route
app.get('/app', (req, res) => {
  const shop = req.query.shop;
  if (!shop) {
    return res.status(400).send('Missing shop parameter');
  }

  res.redirect(`https://${shop}/admin/apps`);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
