export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get URL from query
  const targetUrl = req.query.url;

  if (!targetUrl) {
    res.status(200).json({ 
      error: 'URL parameter is required',
      content: '<html><body style="font-family: Arial; padding: 40px; text-align: center;"><h2>No URL Provided</h2><p>Please enter a URL to browse.</p></body></html>'
    });
    return;
  }

  // Validate URL format
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (e) {
    res.status(200).json({ 
      error: 'Invalid URL',
      content: '<html><body style="font-family: Arial; padding: 40px; text-align: center;"><h2>Invalid URL</h2><p>Please enter a valid URL (e.g., https://example.com)</p></body></html>'
    });
    return;
  }

  try {
    // Fetch the page
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });

    // Check response status
    if (!response.ok) {
      res.status(200).json({ 
        error: 'Failed to fetch page',
        content: '<html><body style="font-family: Arial; padding: 40px; text-align: center;"><h2>Error ' + response.status + '</h2><p>' + response.statusText + '</p><p style="color: #666;">Could not load: ' + targetUrl + '</p></body></html>'
      });
      return;
    }

    // Get content type
    const contentType = response.headers.get('content-type') || '';
    
    // Check if HTML
    if (!contentType.includes('text/html')) {
      res.status(200).json({ 
        error: 'Not an HTML page',
        content: '<html><body style="font-family: Arial; padding: 40px; text-align: center;"><h2>Unsupported Content</h2><p>This is not an HTML page (Content-Type: ' + contentType + ')</p></body></html>'
      });
      return;
    }

    // Get HTML content
    let html = await response.text();
    
    // Fix relative URLs - href and src
    html = html.replace(
      /(href|src)=["'](?!http|\/\/|data:|mailto:|javascript:|#)([^"']+)["']/gi,
      function(match, attr, url) {
        try {
          const absolute = new URL(url, parsedUrl.href).href;
          return attr + '="' + absolute + '"';
        } catch (e) {
          return match;
        }
      }
    );

    // Fix CSS url()
    html = html.replace(
      /url\(["']?(?!http|\/\/|data:)([^"')]+)["']?\)/gi,
      function(match, url) {
        try {
          const absolute = new URL(url, parsedUrl.href).href;
          return 'url("' + absolute + '")';
        } catch (e) {
          return match;
        }
      }
    );

    // Return success
    res.status(200).json({ 
      content: html,
      success: true
    });

  } catch (error) {
    // Catch any errors
    console.error('Proxy error:', error);
    res.status(200).json({ 
      error: 'Connection failed',
      content: '<html><body style="font-family: Arial; padding: 40px; text-align: center;"><h2>Connection Error</h2><p>Failed to connect to the website.</p><p style="color: #666;">' + error.message + '</p></body></html>'
    });
  }
}


// ===== NODE.JS / EXPRESS VERSION =====
// If you're using Express.js instead of Vercel, use this:

/*
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/api/proxy', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.json({ 
      error: 'URL parameter is required',
      content: '<html><body style="font-family: Arial; padding: 40px; text-align: center;"><h2>No URL Provided</h2></body></html>'
    });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (e) {
    return res.json({ 
      error: 'Invalid URL',
      content: '<html><body style="font-family: Arial; padding: 40px; text-align: center;"><h2>Invalid URL</h2></body></html>'
    });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*!/!*;q=0.8'
      }
    });

    if (!response.ok) {
      return res.json({ 
        error: 'Failed to fetch',
        content: '<html><body style="font-family: Arial; padding: 40px; text-align: center;"><h2>Error ' + response.status + '</h2></body></html>'
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.json({ 
        error: 'Not HTML',
        content: '<html><body style="font-family: Arial; padding: 40px; text-align: center;"><h2>Not an HTML page</h2></body></html>'
      });
    }

    let html = await response.text();
    
    html = html.replace(
      /(href|src)=["'](?!http|\/\/|data:|mailto:|javascript:|#)([^"']+)["']/gi,
      function(match, attr, url) {
        try {
          return attr + '="' + new URL(url, parsedUrl.href).href + '"';
        } catch (e) {
          return match;
        }
      }
    );

    res.json({ content: html, success: true });

  } catch (error) {
    console.error('Error:', error);
    res.json({ 
      error: error.message,
      content: '<html><body style="font-family: Arial; padding: 40px; text-align: center;"><h2>Error</h2><p>' + error.message + '</p></body></html>'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
*/
