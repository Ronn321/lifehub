import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const PORT = Number(process.env.CDP_PORT || 9231);
const ROOT = 'C:/Users/dasil/Documents/LifeHub';
const UI = `file:///${ROOT}/docs/reviews/2026-08-22_lifehub_ui_design_review.html`;
const CODE = `file:///${ROOT}/docs/reviews/2026-08-22_lifehub_code_functionality_review.html`;
const OUT = `${ROOT}/docs/reviews/evidence/2026-08-22-lifehub/interactive-review-browser-test.json`;
const SCREEN_DIR = `${ROOT}/docs/reviews/evidence/2026-08-22-lifehub/screenshots/interactive-review`;
fs.mkdirSync(SCREEN_DIR, { recursive: true });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getJson = (urlPath) => new Promise((resolve, reject) => {
  const request = http.get({ host: '127.0.0.1', port: PORT, path: urlPath }, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => resolve(JSON.parse(data)));
  });
  request.on('error', reject);
});

const targets = await getJson('/json/list');
const target = targets.find((item) => item.type === 'page');
assert.ok(target, 'CDP page target missing');
const ws = new WebSocket(target.webSocketDebuggerUrl);
let requestId = 1;
const pending = new Map();
const consoleErrors = [];
const networkRequests = [];
ws.onmessage = (event) => {
  const message = JSON.parse(String(event.data));
  if (message.id && pending.has(message.id)) {
    const callback = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
    else callback.resolve(message.result || {});
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') consoleErrors.push(message.params);
  if (message.method === 'Log.entryAdded' && message.params?.entry?.level === 'error') consoleErrors.push(message.params.entry);
  if (message.method === 'Network.requestWillBeSent') networkRequests.push(message.params.request.url);
};
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = requestId++;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
for (const domain of ['Page', 'Runtime', 'Network', 'Log']) await send(`${domain}.enable`);
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result?.value;
}

async function open(url) {
  consoleErrors.length = 0;
  networkRequests.length = 0;
  await send('Page.navigate', { url });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await wait(100);
    const ready = await evaluate(`document.readyState === 'complete' && !!window.InteractiveReviewTestAPI`);
    if (ready) return;
  }
  throw new Error(`Timed out loading ${url}`);
}

async function screenshot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  const output = `${SCREEN_DIR}/${name}.png`;
  fs.writeFileSync(output, Buffer.from(result.data, 'base64'));
  return output;
}

async function dragOverlay(tool, x1Ratio, y1Ratio, x2Ratio, y2Ratio) {
  await evaluate(`document.querySelector('[data-annotation-tool="${tool}"]').click()`);
  const box = await evaluate(`(() => { const r=document.getElementById('annotationOverlay').getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })()`);
  const x1 = box.x + box.w * x1Ratio, y1 = box.y + box.h * y1Ratio;
  const x2 = box.x + box.w * x2Ratio, y2 = box.y + box.h * y2Ratio;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x2, y: y2, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1 });
  await wait(250);
}

const checks = [];
function passed(name, details = {}) { checks.push({ name, status: 'PASS', ...details }); }

await open(UI);
await evaluate(`InteractiveReviewTestAPI.reset()`);
assert.equal(await evaluate(`InteractiveReviewTestAPI.getReview().reportId`), 'lifehub-ui-review-2026-08-22');
assert.equal(await evaluate(`InteractiveReviewTestAPI.getReview().areas.reduce((n,a)=>n+a.findings.length,0)`), 17);
assert.equal(await evaluate(`document.querySelectorAll('#tabs .tab').length`), 8);
assert.equal(await evaluate(`document.querySelectorAll('.stat.s-P1 b')[0].textContent`), '10');
assert.equal(await evaluate(`window.REVIEW_VERSIONS[0].areas.flatMap(a=>a.images).every(i=>i.src.startsWith('data:image/')&&i.thumb.startsWith('data:image/'))`), true);
assert.equal(await evaluate(`Math.max(...[...document.querySelectorAll('img.thumb')].map(i=>i.getBoundingClientRect().height)) <= 190`), true);
assert.equal(networkRequests.filter((url) => /^https?:/.test(url)).length, 0);
passed('UI standalone load, counts, embedded images and thumbnail sizing');

await evaluate(`InteractiveReviewTestAPI.setArea('dashboard')`);
await evaluate(`(() => { const t=document.querySelector('[data-area-comment="dashboard"]'); const s=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set; s.call(t,'Dashboard allgemein kompakter'); t.dispatchEvent(new Event('input',{bubbles:true})); const h=document.querySelector('[data-toggle-finding]'); h.click(); const a=document.querySelector('.finding.open .decision.accept'); a.click(); return true; })()`);
await wait(400);
const firstFindingId = await evaluate(`document.querySelector('.finding').dataset.finding`);
assert.equal(await evaluate(`InteractiveReviewTestAPI.getState().draft.areas.dashboard.comment`), 'Dashboard allgemein kompakter');
assert.equal(await evaluate(`Object.values(InteractiveReviewTestAPI.getState().draft.findings[${JSON.stringify(firstFindingId)}].suggestions)[0].decision`), 'accept');
passed('Area comment and accept decision autosave');

const firstImageId = await evaluate(`InteractiveReviewTestAPI.getReview().areas.find(a=>a.id==='dashboard').images[0].id`);
await evaluate(`InteractiveReviewTestAPI.openImage(${JSON.stringify(firstImageId)}, ${JSON.stringify(firstFindingId)})`);
await wait(250);
await dragOverlay('rect', .1, .12, .35, .32);
await dragOverlay('ellipse', .5, .45, .72, .68);
assert.equal(await evaluate(`InteractiveReviewTestAPI.getState().draft.markers.length`), 2);
assert.deepEqual(await evaluate(`InteractiveReviewTestAPI.getState().draft.markers.map(m=>m.type)`), ['rect', 'ellipse']);
await evaluate(`(() => { const t=document.querySelector('[data-marker-comment]'); const s=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set; s.call(t,'Markierung eins'); t.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
await wait(300);
assert.equal(await evaluate(`InteractiveReviewTestAPI.getState().draft.markers[0].comment`), 'Markierung eins');
await evaluate(`document.querySelector('[data-close-lightbox]').click()`);
passed('Rectangle/ellipse annotations and marker-linked comment');

const v1 = await evaluate(`InteractiveReviewTestAPI.finalize('2026-08-22T10:00:00Z')`);
assert.equal(v1.created, true);
assert.equal(v1.payload.changeRequestVersion, 1);
assert.equal(v1.payload.fullState.markers.length, 2);
await evaluate(`(() => { const s=InteractiveReviewTestAPI.getState(); s.draft.findings[${JSON.stringify(firstFindingId)}].comment='Nur dieser Punkt wurde in v2 geändert'; InteractiveReviewTestAPI.setDraft(s.draft); return true; })()`);
const v2 = await evaluate(`InteractiveReviewTestAPI.finalize('2026-08-22T11:00:00Z')`);
assert.equal(v2.created, true);
assert.equal(v2.payload.changeRequestVersion, 2);
assert.equal(v2.payload.baseChangeRequestVersion, 1);
assert.ok(v2.payload.fullState.findings[firstFindingId].comment.includes('v2'));
assert.deepEqual(v2.payload.deltaFromPrevious.changedFindingIds, [firstFindingId]);
assert.ok(v2.payload.deltaFromPrevious.unchangedFindingCount >= 0);
assert.equal(await evaluate(`document.querySelectorAll('[data-revision]').length`), 2);
passed('FA v1/v2 full-state plus delta semantics', { changedFindingIds: v2.payload.deltaFromPrevious.changedFindingIds });

await evaluate(`document.querySelector('[data-revision="1"]').click()`);
assert.equal(await evaluate(`document.body.classList.contains('readonly')`), true);
assert.equal(await evaluate(`document.getElementById('finishBtn').disabled`), true);
await evaluate(`document.querySelector('[data-draft]').click()`);
assert.equal(await evaluate(`document.body.classList.contains('readonly')`), false);
passed('Timeline historical snapshot is read-only');

await send('Page.reload');
for (let attempt = 0; attempt < 120; attempt += 1) { await wait(100); if (await evaluate(`document.readyState==='complete' && !!window.InteractiveReviewTestAPI`)) break; }
assert.equal(await evaluate(`InteractiveReviewTestAPI.getState().revisions.length`), 2);
assert.equal(await evaluate(`InteractiveReviewTestAPI.getState().draft.areas.dashboard.comment`), 'Dashboard allgemein kompakter');
passed('Local persistence survives reload');
const uiScreenshot = await screenshot('ui-interactive-review-verified');

await open(CODE);
assert.equal(await evaluate(`InteractiveReviewTestAPI.getReview().reportId`), 'lifehub-code-review-2026-08-22');
assert.equal(await evaluate(`InteractiveReviewTestAPI.getReview().areas.reduce((n,a)=>n+a.findings.length,0)`), 72);
assert.equal(await evaluate(`InteractiveReviewTestAPI.getState().revisions.length`), 0);
assert.equal(await evaluate(`InteractiveReviewTestAPI.getReview().areas.find(a=>a.id==='jellyfin-music').images.length`), 40);
assert.equal(await evaluate(`InteractiveReviewTestAPI.getReview().areas.find(a=>a.id==='jellyfin-video').images.length`), 22);
assert.equal(await evaluate(`document.querySelectorAll('#tabs .tab').length`), 11);
assert.equal(await evaluate(`document.getElementById('tabs').scrollWidth <= document.getElementById('tabs').clientWidth`), true, 'Desktop tabs must wrap instead of horizontal scrolling');
assert.equal(networkRequests.filter((url) => /^https?:/.test(url)).length, 0);
await evaluate(`InteractiveReviewTestAPI.setArea('jellyfin-music')`);
assert.equal(await evaluate(`new Set([...document.querySelectorAll('#main [data-open-image]')].map(e=>e.dataset.openImage)).size`), 40);
assert.equal(await evaluate(`[...document.querySelectorAll('#main h3')].some(h=>h.textContent.includes('40 Screenshots'))`), true);
passed('Code report independent namespace and complete Jellyfin galleries');
const codeScreenshot = await screenshot('code-interactive-review-jellyfin-verified');

await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
await open(UI);
assert.equal(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), true, 'Mobile report body must not overflow horizontally');
assert.equal(await evaluate(`getComputedStyle(document.getElementById('timeline')).display`), 'flex');
assert.equal(await evaluate(`document.getElementById('tabs').scrollWidth >= document.getElementById('tabs').clientWidth`), true);
const mobileScreenshot = await screenshot('ui-interactive-review-mobile-verified');
passed('Review app responsive at 375x812 without page-level horizontal overflow');

assert.equal(consoleErrors.length, 0, `Console errors: ${JSON.stringify(consoleErrors)}`);
passed('No JavaScript exceptions or error log entries');

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: 'PASS',
  checks,
  screenshots: [uiScreenshot, codeScreenshot, mobileScreenshot],
};
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
ws.close();
