const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// Middleware to set CSP headers dynamically based on the shop domain
app.use((req, res, next) => {
  const urlParts = req.url.split('?');
  
  // Check if there are query parameters in the request
  if (urlParts.length >= 2) {
    const queryString = new URLSearchParams(urlParts[1]);
    const shop = queryString.get('shop');
    
    // If the 'shop' parameter is present and ends with 'myshopify.com'
    if (shop && shop.endsWith('myshopify.com')) {
      // Set Content-Security-Policy to allow framing by the authenticated shop domain
      res.setHeader(
        'Content-Security-Policy',
        `frame-ancestors 'self' https://*.myshopify.com https://${shop}`
      );
    } else {
      // Default CSP if shop domain is not present or invalid
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.myshopify.com https://*.shopify.com https://admin.shopify.com");
    }
  } else {
    // Default CSP if no query parameters
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.myshopify.com https://*.shopify.com https://admin.shopify.com");
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
    // Store the access token securely and respond to the frontend
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
