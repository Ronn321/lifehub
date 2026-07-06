import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { URL } from 'url';

let browser;

async function getBrowser() {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-infobars',
        '--window-size=1280,720',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
      ],
    });
  }
  return browser;
}

async function getPageContent(url, method = 'GET', postData = null) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Only block heavy media, allow CSS/JS for proper rendering
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'media', 'font'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Hide automation from websites
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    await page.evaluateOnNewDocument(() => {
      // Overwrite the navigator properties
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'languages', { get: () => ['de-DE', 'de', 'en-US', 'en'] });
    });

    if (method === 'POST' && postData) {
      await page.setExtraHTTPHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // For POST we'd need proper form submission
    } else {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    // Wait a bit for JS to execute
    await new Promise(r => setTimeout(r, 2000));

    const html = await page.content();
    return html;
  } finally {
    await page.close();
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (path === '/content' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { url: targetUrl, method: httpMethod, postData } = JSON.parse(body);
        if (!targetUrl) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing url' }));
          return;
        }
        const html = await getPageContent(targetUrl, httpMethod || 'GET', postData || null);

        // Rewrite relative URLs
        const base = new URL(targetUrl);
        const escapedOrigin = base.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let proxied = html
          .replace(/src="\//g, `src="${base.origin}/`)
          .replace(/href="\//g, `href="${base.origin}/`)
          .replace(/src='\//g, `src='${base.origin}/`)
          .replace(/href='\//g, `href='${base.origin}/`)
          .replace(/action="\//g, `action="/api/v1/browser/proxy?url=${base.origin}/`)
          .replace(/action='\//g, `action='/api/v1/browser/proxy?url=${base.origin}/`);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(proxied);
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (path === '/screenshot' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { url: targetUrl } = JSON.parse(body);
        if (!targetUrl) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing url' }));
          return;
        }
        const browser = await getBrowser();
        const page = await browser.newPage();
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));
        const buffer = await page.screenshot({ type: 'png', fullPage: false });
        await page.close();

        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(buffer);
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (path === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Browser renderer listening on http://0.0.0.0:${PORT}`);
});
