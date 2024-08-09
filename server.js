const express = require('express');
const axios = require('axios');
const crypto = require('crypto'); // For generating secure random nonces
require('dotenv').config();

const app = express();
app.use(express.json());

// Middleware to generate a nonce and set CSP headers
app.use((req, res, next) => {
  // Generate a random nonce
  const nonce = crypto.randomBytes(16).toString('base64');
  
  const shop = req.query.shop || '';
  let frameAncestors = "frame-ancestors https://admin.shopify.com";
  
  if (shop && shop.endsWith('myshopify.com')) {
    frameAncestors = `frame-ancestors https://${shop} https://admin.shopify.com`;
  }

  // Content-Security-Policy with report-uri and nonce
  const csp = [
    "default-src 'self'",
    `script-src 'strict-dynamic' 'nonce-${nonce}' 'unsafe-inline' http: https:`,
    "object-src 'none'",
    "base-uri 'none'",
    "require-trusted-types-for 'script'",
    "report-uri https://clickinvoice.netlify.app/.Netlify/csp-report",
    frameAncestors
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);

  // Pass nonce to the response locals for use in templates
  res.locals.nonce = nonce;
  
  next();
});

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
