const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_REDIRECT_URI } = process.env;

// Step 3: Handle Shopify OAuth Callback
app.post('/api/shopify/callback', async (req, res) => {
  const { shop, code, hmac } = req.body;

  if (!shop || !code || !hmac) {
    return res.status(400).send('Required parameters missing');
  }

  const queryString = `code=${code}&shop=${shop}`;
  const generatedHmac = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(queryString)
    .digest('hex');

  // Validate the request's HMAC
  if (generatedHmac !== hmac) {
    return res.status(400).send('HMAC validation failed');
  }

  // Exchange the authorization code for an access token
  try {
    const response = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code
    });

    const accessToken = response.data.access_token;

    // Here you can save the access token to your database
    // and use it to make authenticated requests to the Shopify API

    res.status(200).send({ success: true, accessToken });
  } catch (error) {
    console.error('Error exchanging code for access token:', error);
    res.status(500).send('Error exchanging code for access token');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
