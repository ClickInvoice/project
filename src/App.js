import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Page, Card, Button, DropZone, Text, AppProvider, Link } from '@shopify/polaris';
import './App.css';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import queryString from 'query-string';
import axios from 'axios';

// Shopify API credentials
const API_KEY = 'd77db820807364fdf6493f130916fe8c';
const API_SECRET = '34eeaa26270ddcf5c4b5c3c7347f6c22';
const REDIRECT_URI = 'https://clickinvoice.netlify.app/';
const SCOPES = 'read_orders,write_orders';

// Normalize headers to snake_case
const normalizeHeader = (header) => {
  return header
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, ''); // Removed unnecessary escape character
};

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // Handles file selection
  const handleDropZoneDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]); // Select the first file
    } else {
      setFile(null);
    }
  };

  const handleGenerateInvoices = async () => {
    if (!file) {
      setStatus('Please upload a CSV file.');
      return;
    }

    setLoading(true);
    setStatus('');

    try {
      // Fetch the template
      const response = await fetch('/invoice_template.docx');
      const templateArrayBuffer = await response.arrayBuffer();

      // Parse the CSV file
      Papa.parse(file, {
        header: true, // Assumes first row contains headers
        complete: async (results) => {
          const zip = new JSZip();

          // Iterate over each row
          results.data.forEach(async (row, index) => {
            // Construct context object with normalized headers
            const context = {};
            Object.keys(row).forEach((key) => {
              const normalizedKey = normalizeHeader(key);
              context[normalizedKey] = row[key];
            });

            try {
              // Load and process the template
              const zipFile = new PizZip(templateArrayBuffer);
              const doc = new Docxtemplater(zipFile);
              doc.setData(context);
              doc.render();

              const output = doc.getZip().generate({ type: 'blob' });
              zip.file(`invoice_${index + 1}.docx`, output);
            } catch (error) {
              console.error('Error rendering template for row', index + 1, error);
            }
          });

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

  // OAuth Flow: Handle redirection to Shopify and callback
  useEffect(() => {
    const { shop, code, hmac } = queryString.parse(window.location.search);

    if (shop && !code) {
      // Step 1: Redirect to Shopify for app installation
      const redirectUri = encodeURIComponent(REDIRECT_URI);
      const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=${SCOPES}&redirect_uri=${redirectUri}&state=random_state_string`;

      window.location.href = installUrl;
    } else if (shop && code && hmac) {
      // Step 2: Handle OAuth callback and exchange code for access token
      axios.post('/api/shopify/callback', { code, shop, hmac })
        .then(response => {
          console.log('Authentication successful:', response.data);
          // Redirect to the main page or dashboard
          window.location.href = '/dashboard';
        })
        .catch(error => {
          console.error('Authentication error:', error);
        });
    }
  }, []);

  return (
    <AppProvider>
      <Page title="Click Invoice - Bulk Invoice Generator">
        <Card title="Upload CSV and Generate Invoices" sectioned>
          <DropZone
            allowMultiple={false}
            onDrop={handleDropZoneDrop}
            dropZoneText="Drag and drop a CSV file or click to select one"
          >
            {file ? (
              <Text variant="bodyMd" as="p">
                {file.name}
              </Text>
            ) : (
              <Text variant="bodyMd" as="p">
                No file chosen
              </Text>
            )}
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
            Enjoying Click Invoice? Get the full experience with Mail Merge integration on the Google Workspace Marketplace: <Link url="https://workspace.google.com/marketplace/app/clickinvoice/..." external>
              Install Click Invoice with Mail Merge
            </Link>
          </Text>
        </Card>
      </Page>
    </AppProvider>
  );
}

export default App;
