// src/shopifyAppBridge.js
import { AppProvider, TitleBar } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { useLocation } from 'react-router-dom'; // or any routing library you use
import { useEffect } from 'react';

export const useShopifyAppBridge = (shopOrigin) => {
  useEffect(() => {
    const app = initializeApp({
      apiKey: process.env.REACT_APP_SHOPIFY_API_KEY,
      shopOrigin: shopOrigin,
      forceRedirect: true,
    });

    const redirect = Redirect.create(app);

    redirect.dispatch(Redirect.Action.APP, '/path/to/your/app');
  }, [shopOrigin]);
};
