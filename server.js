const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// Middleware to dynamically set CSP headers based on Shopify domain
app.use(async (req, res, next) => {
  // Get rid of everything before the ? in the URL
  const bits = req.url.split("?");

  // If shopify domain is present, add it to the response headers frame-ancestor list
  if (bits.length >= 2) {
    // Get the "shop" param from the query string
    const queryString = new URLSearchParams(bits[1]);
    const shop = queryString.get("shop");

    // If domain ends with "myshopify.com", allow it
    if (shop && shop.endsWith("myshopify.com")) {
      res.setHeader(
        "Content-Security-Policy",
        `frame-ancestors https://admin.shopify.com https://${shop}`
      );
    } else {
      res.setHeader(
        "Content-Security-Policy",
        "frame-ancestors 'self' https://*.myshopify.com"
      );
    }
  } else {
    res.setHeader(
      "Content-Security-Policy",
      "frame-ancestors 'self' https://*.myshopify.com"
    );
  }

  next();
});

// API endpoint to handle Shopify OAuth callback
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
