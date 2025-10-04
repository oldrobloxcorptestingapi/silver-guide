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
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Fetch the page with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      redirect: 'follow'
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return res.status(200).json({ 
        error: `Failed to fetch page: ${response.status} ${response.statusText}`,
        content: `<html><body style="font-family: Arial; padding: 40px; text-align: center;">
          <h2>Error ${response.status}</h2>
          <p>${response.statusText}</p>
          <p style="color: #666;">The website returned an error.</p>
        </body></html>`
      });
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Check if it's HTML
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return res.status(200).json({ 
        error: 'Not an HTML page',
        content: `<html><body style="font-family: Arial; padding: 40px; text-align: center;">
          <h2>Unsupported Content Type</h2>
          <p>This appears to be a ${contentType.split(';')[0]} file, not a web page.</p>
          <p style="color: #666;">Only HTML pages can be displayed.</p>
        </body></html>`
      });
    }

    let content = await response.text();
    
    // Fix relative URLs in the HTML
    content = content.replace(
      /(href|src)=["'](?!http|\/\/|data:|mailto:|javascript:|#|blob:)(.*?)["']/gi,
      (match, attr, relUrl) => {
        try {
          const absoluteUrl = new URL(relUrl.trim(), targetUrl.href).href;
          return `${attr}="${absoluteUrl}"`;
        } catch (e) {
          return match;
        }
      }
    );

    // Fix CSS url() references
    content = content.replace(
      /url\(['"]?(?!http|\/\/|data:|#)([^'")\s]+)['"]?\)/gi,
      (match, relUrl) => {
        try {
          const absoluteUrl = new URL(relUrl.trim(), targetUrl.href).href;
          return `url('${absoluteUrl}')`;
        } catch (e) {
          return match;
        }
      }
    );

    // Fix srcset attributes
    content = content.replace(
      /srcset=["']([^"']+)["']/gi,
      (match, srcset) => {
        const fixed = srcset.split(',').map(src => {
          const parts = src.trim().split(/\s+/);
          try {
            if (parts[0] && !parts[0].startsWith('http') && !parts[0].startsWith('//') && !parts[0].startsWith('data:')) {
              parts[0] = new URL(parts[0], targetUrl.href).href;
            }
          } catch (e) {}
          return parts.join(' ');
        }).join(', ');
        return `srcset="${fixed}"`;
      }
    );

    // Return successful response
    return res.status(200).json({ 
      content: content,
      success: true 
    });

  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Handle specific errors
    let errorMessage = 'Failed to fetch the page';
    let errorDetails = error.message;

    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout';
      errorDetails = 'The website took too long to respond';
    } else if (error.message.includes('fetch failed')) {
      errorMessage = 'Connection failed';
      errorDetails = 'Could not connect to the website';
    }

    return res.status(200).json({ 
      error: errorMessage,
      content: `<html><body style="font-family: Arial; padding: 40px; text-align: center;">
        <h2>${errorMessage}</h2>
        <p>${errorDetails}</p>
        <p style="color: #666;">URL: ${url}</p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">Try checking if the URL is correct and accessible.</p>
      </body></html>`
    });
  }
}


// ===== EXPRESS.JS VERSION (if not using Vercel) =====
// Uncomment below if you're using Express.js instead of Vercel

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
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      timeout: 10000
    });

    if (!response.ok) {
      return res.status(200).json({ 
        error: `Failed to fetch: ${response.status} ${response.statusText}`,
        content: `<html><body style="font-family: Arial; padding: 40px; text-align: center;">
          <h2>Error ${response.status}</h2>
          <p>${response.statusText}</p>
        </body></html>`
      });
    }

    const contentType = response.headers.get('content-type') || '';
    
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return res.status(200).json({ 
        error: 'Not an HTML page',
        content: `<html><body style="font-family: Arial; padding: 40px; text-align: center;">
          <h2>Unsupported Content Type</h2>
          <p>Only HTML pages can be displayed.</p>
        </body></html>`
      });
    }

    let content = await response.text();
    
    content = content.replace(
      /(href|src)=["'](?!http|\/\/|data:|mailto:|javascript:|#)(.*?)["']/gi,
      (match, attr, relUrl) => {
        try {
          const absoluteUrl = new URL(relUrl.trim(), targetUrl.href).href;
          return `${attr}="${absoluteUrl}"`;
        } catch (e) {
          return match;
        }
      }
    );

    content = content.replace(
      /url\(['"]?(?!http|\/\/|data:)([^'")\s]+)['"]?\)/gi,
      (match, relUrl) => {
        try {
          const absoluteUrl = new URL(relUrl.trim(), targetUrl.href).href;
          return `url('${absoluteUrl}')`;
        } catch (e) {
          return match;
        }
      }
    );

    res.json({ content: content, success: true });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(200).json({ 
      error: 'Failed to fetch the page',
      content: `<html><body style="font-family: Arial; padding: 40px; text-align: center;">
        <h2>Connection Error</h2>
        <p>${error.message}</p>
      </body></html>`
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
