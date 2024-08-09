const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// Middleware to set CSP headers dynamically based on the shop domain
app.use((req, res, next) => {
  const urlParts = req.url.split('?');

  if (urlParts.length >= 2) {
    const queryString = new URLSearchParams(urlParts[1]);
    const shop = queryString.get('shop');

    if (shop && shop.endsWith('myshopify.com')) {
      res.setHeader(
        'Content-Security-Policy',
        `frame-ancestors 'self' https://*.myshopify.com https://${shop}`
      );
    } else {
      res.setHeader(
        'Content-Security-Policy',
        "frame-ancestors 'self' https://*.myshopify.com"
      );
    }
  } else {
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://*.myshopify.com"
    );
  }

  next();
});

app.post('/api/shopify/callback', async (req, res) => {
  const { code, shop, hmac } = req.body;
  const API_KEY = process.env.SHOPIFY_API_KEY;
  const API_SECRET = process.env.SHOPIFY_API_SECRET;
  const REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI;

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
