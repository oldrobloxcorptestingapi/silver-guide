// For Vercel: Save as /api/proxy.js
// For Express: Use the code at the bottom

// ===== VERCEL SERVERLESS FUNCTION =====
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // Validate URL
    const targetUrl = new URL(url);
    
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch: ${response.statusText}` 
      });
    }

    const contentType = response.headers.get('content-type');
    
    // Only process HTML content
    if (!contentType || !contentType.includes('text/html')) {
      return res.status(400).json({ 
        error: 'Only HTML pages are supported' 
      });
    }

    let content = await response.text();
    
    // Fix relative URLs in the HTML
    content = content.replace(
      /(href|src)=["'](?!http|\/\/|data:|mailto:|javascript:|#)(.*?)["']/gi,
      (match, attr, relUrl) => {
        try {
          const absoluteUrl = new URL(relUrl, targetUrl).href;
          return `${attr}="${absoluteUrl}"`;
        } catch {
          return match;
        }
      }
    );

    // Fix CSS url() references
    content = content.replace(
      /url\(['"]?(?!http|\/\/|data:)([^'")\s]+)['"]?\)/gi,
      (match, relUrl) => {
        try {
          const absoluteUrl = new URL(relUrl, targetUrl).href;
          return `url('${absoluteUrl}')`;
        } catch {
          return match;
        }
      }
    );

    res.status(200).json({ content });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch the page',
      details: error.message 
    });
  }
}


// ===== EXPRESS.JS VERSION (if not using Vercel) =====
// Uncomment below if you're using Express.js

/*
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

app.get('/api/proxy', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const targetUrl = new URL(url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch: ${response.statusText}` 
      });
    }

    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('text/html')) {
      return res.status(400).json({ 
        error: 'Only HTML pages are supported' 
      });
    }

    let content = await response.text();
    
    content = content.replace(
      /(href|src)=["'](?!http|\/\/|data:|mailto:|javascript:|#)(.*?)["']/gi,
      (match, attr, relUrl) => {
        try {
          const absoluteUrl = new URL(relUrl, targetUrl).href;
          return `${attr}="${absoluteUrl}"`;
        } catch {
          return match;
        }
      }
    );

    content = content.replace(
      /url\(['"]?(?!http|\/\/|data:)([^'")\s]+)['"]?\)/gi,
      (match, relUrl) => {
        try {
          const absoluteUrl = new URL(relUrl, targetUrl).href;
          return `url('${absoluteUrl}')`;
        } catch {
          return match;
        }
      }
    );

    res.json({ content });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch the page',
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
*/
