import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => console.log(`[PAGE_ERROR] ${err.message}`));
page.on('requestfailed', req => console.log(`[REQ_FAIL] ${req.url().substring(0,120)}`));

// Login
console.log('=== Login ===');
await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0', timeout: 20000 });
await page.type('input[type="email"], input[name="email"]', 'admin@lifehub.local');
await page.type('input[type="password"], input[name="password"]', 'admin12345');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
await page.screenshot({ path: 'after_login.png', fullPage: true });
console.log('URL after login:', page.url());

// Go to jellyfin
console.log('\n=== Jellyfin ===');
await page.goto('http://localhost:3001/jellyfin', { waitUntil: 'networkidle0', timeout: 20000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: 'jellyfin.png', fullPage: true });
console.log('Jellyfin URL:', page.url());

const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 400));
console.log('Page text:', bodyText);

// Click first video item (FolderItemCard)
const cards = await page.$$('[class*="rounded-lg"][class*="cursor-pointer"]');
console.log(`Found ${cards.length} cards`);
for (let i = 0; i < Math.min(cards.length, 5); i++) {
  const text = await cards[i].evaluate(el => el.textContent?.substring(0,80));
  console.log(`  Card ${i}:`, text);
}

// Try clicking the first one
if (cards.length > 0) {
  console.log('\n=== Clicking first card ===');
  await cards[0].click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'after_click.png', fullPage: true });
  
  // Check for player elements
  const playerInDOM = await page.evaluate(() => {
    const vids = document.querySelectorAll('video');
    const players = document.querySelectorAll('[class*="media-player"], [class*="vds"]');
    return {
      videoCount: vids.length,
      playerCount: players.length,
      videoInfo: Array.from(vids).map(v => ({ 
        src: v.src?.substring(0,80), 
        readyState: v.readyState, 
        width: v.videoWidth, 
        height: v.videoHeight,
        visible: v.offsetWidth > 0 && v.offsetHeight > 0,
        rect: v.getBoundingClientRect()
      }))
    };
  });
  console.log('Player DOM:', JSON.stringify(playerInDOM, null, 2));
  
  // Also check all fixed overlays
  const fixedOverlays = await page.evaluate(() => {
    const overlays = document.querySelectorAll('.fixed.inset-0');
    return Array.from(overlays).map(o => ({
      classes: o.className,
      rect: o.getBoundingClientRect(),
      innerHtml_subset: o.innerHTML.substring(0, 200)
    }));
  });
  console.log('Fixed overlays:', JSON.stringify(fixedOverlays, null, 2));
}

await browser.close();
