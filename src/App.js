// src/App.js
import React, { useState, useEffect } from 'react';
import { AppProvider, Page, Card, Button, DropZone, Text, Link } from '@shopify/polaris';
import { BrowserRouter as Router } from 'react-router-dom';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import queryString from 'query-string';
import axios from 'axios';
import { initializeApp } from '@shopify/app-bridge';
import { Redirect } from '@shopify/app-bridge/actions';
import './App.css';

// Shopify API credentials from environment variables
const API_KEY = process.env.REACT_APP_SHOPIFY_API_KEY;
const REDIRECT_URI = process.env.REACT_APP_SHOPIFY_REDIRECT_URI;
const SCOPES = ''; // Add necessary scopes if required

const normalizeHeader = (header) =>
  header
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '');

const useShopifyAppBridge = (shopOrigin) => {
  useEffect(() => {
    const app = initializeApp({
      apiKey: API_KEY,
      shopOrigin: shopOrigin,
      forceRedirect: true,
    });

    const redirect = Redirect.create(app);

    redirect.dispatch(Redirect.Action.APP, '/path/to/your/app');
  }, [shopOrigin]);
};

const App = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [shopOrigin, setShopOrigin] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setShopOrigin(urlParams.get('shop') || '');
  }, []);

  useShopifyAppBridge(shopOrigin);

  const handleDropZoneDrop = (acceptedFiles) => {
    setFile(acceptedFiles.length > 0 ? acceptedFiles[0] : null);
  };

  const handleGenerateInvoices = async () => {
    if (!file) {
      setStatus('Please upload a CSV file.');
      return;
    }

    setLoading(true);
    setStatus('');

    try {
      const response = await fetch('/invoice_template.docx');
      const templateArrayBuffer = await response.arrayBuffer();

      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const zip = new JSZip();

          await Promise.all(results.data.map(async (row, index) => {
            const context = {};
            Object.keys(row).forEach(key => {
              context[normalizeHeader(key)] = row[key];
            });

            try {
              const zipFile = new PizZip(templateArrayBuffer);
              const doc = new Docxtemplater(zipFile);
              doc.setData(context);
              doc.render();

              const output = doc.getZip().generate({ type: 'blob' });
              zip.file(`invoice_${index + 1}.docx`, output);
            } catch (error) {
              console.error('Error rendering template for row', index + 1, error);
            }
          }));

          const content = await zip.generateAsync({ type: 'blob' });
          saveAs(content, 'shopify_invoices.zip');
          setStatus('Invoices generated successfully and saved to your Downloads folder!');
        }
      });
    } catch (error) {
      setStatus('An error occurred while generating invoices.');
      console.error('Error fetching or processing the template:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { shop, code, hmac } = queryString.parse(window.location.search);

    if (shop) {
      if (!code) {
        const state = 'random_state_string'; // Replace with a unique state string
        const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;
        window.location.href = installUrl;
      } else if (code && hmac) {
        axios.post('/api/shopify/callback', { code, shop, hmac })
          .then(response => {
            console.log('Authentication successful:', response.data);
            window.location.href = '/'; // Redirect to the root URL
          })
          .catch(error => {
            console.error('Authentication error:', error);
          });
      }
    }
  }, []);

  return (
    <AppProvider>
      <Router>
        <Page title="Click Invoice - Bulk Invoice Generator">
          <Card title="Upload CSV and Generate Invoices" sectioned>
            <DropZone
              allowMultiple={false}
              onDrop={handleDropZoneDrop}
              dropZoneText="Drag and drop a CSV file or click to select one"
            >
              <Text variant="bodyMd" as="p">
                {file ? file.name : 'No file chosen'}
              </Text>
            </DropZone>
            <Button
              primary
              onClick={handleGenerateInvoices}
              loading={loading}
              disabled={loading}
              style={{ marginTop: '20px' }}
            >
              Generate Invoices
            </Button>
            {status && <Text style={{ marginTop: '20px' }}>{status}</Text>}
          </Card>
          <Card title="Support Us" sectioned>
            <Text variant="bodyMd" as="p">
              Instructions: <br />
              1. Download CSV order export <br />
              2. Upload to ClickInvoice <br />
              3. Click "Generate Invoices" <br />
            </Text>
            <br />
            <Text variant="bodyMd" as="p" style={{ marginTop: '10px' }}>
              If you are enjoying Click Invoice, a cup of coffee would make our day. Keep it free by donating: 
              <Link url="https://buymeacoffee.com/clickinvoice" external>
                Donate
              </Link>
            </Text>
          </Card>
        </Page>
      </Router>
    </AppProvider>
  );
};

export default App;
