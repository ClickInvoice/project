const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// Middleware to set CSP headers with frame-ancestors directive
app.use((req, res, next) => {
  let frameAncestors = "frame-ancestors https://admin.shopify.com";

  // Extract query parameters from URL
  const urlParts = req.url.split('?');
  if (urlParts.length >= 2) {
    const queryString = new URLSearchParams(urlParts[1]);
    const shop = queryString.get('shop');

    if (shop && shop.endsWith('myshopify.com')) {
      frameAncestors = `frame-ancestors https://${shop} https://admin.shopify.com`;
    }
  }

  res.setHeader('Content-Security-Policy', frameAncestors);
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
