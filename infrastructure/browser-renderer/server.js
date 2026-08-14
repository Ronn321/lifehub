import { createServer } from 'node:http';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { basename, join } from 'node:path';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { URL } from 'node:url';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import WebSocket, { WebSocketServer } from 'ws';
import * as wrtc from '@roamhq/wrtc';
import { createRendererToken, verifyRendererToken } from './auth.js';

// @roamhq/wrtc >=0.10: ESM-Wrapper mit default-Export (alles liegt unter wrtc.default).
// Ältere Versionen exportieren direkt. Beides abdecken:
const wrtcApi = wrtc.default ?? wrtc;
const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, nonstandard } = wrtcApi;
const { RTCVideoSource, RTCAudioSource } = nonstandard;

const PORT = Number(process.env.PORT || 3000);
const RENDERER_KEY = process.env.BROWSER_RENDERER_KEY || '';
const PROFILE_ROOT = process.env.BROWSER_PROFILE_ROOT || '/data/browser-profiles';
const CHROMIUM_PATH = process.env.BROWSER_EXECUTABLE_PATH || '/usr/bin/chromium';
const SESSION_IDLE_MS = Number(process.env.BROWSER_SESSION_IDLE_MS || 15 * 60 * 1000);
const MAX_DOWNLOAD_BYTES = Number(process.env.BROWSER_MAX_DOWNLOAD_BYTES || 500 * 1024 * 1024);
// PULSE_SERVER muss auf das tatsächliche Socket zeigen: PulseAudio legt es mit
// XDG_RUNTIME_DIR=/tmp/pulse unter /tmp/pulse/pulse/native ab (nicht /tmp/pulse/native).
// Falscher Pfad = ffmpeg kann nie Audio aufnehmen = stummer Stream.
const PULSE_SERVER = process.env.PULSE_SERVER || 'unix:/tmp/pulse/pulse/native';
const DEFAULT_VIEWPORT = { width: 1280, height: 720 };
const INTERNAL_HOSTS = (process.env.BROWSER_INTERNAL_HOSTS || '')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

function assertSessionId(id) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new Error('Ungültige Browser-Session');
  return id;
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

let pulseProcess = null;
async function ensurePulseAudio() {
  if (pulseProcess) return;
  await mkdir('/tmp/pulse', { recursive: true });
  pulseProcess = spawn('pulseaudio', [
    '--daemonize=no',
    '--exit-idle-time=-1',
    '--log-target=stderr',
  ], {
    env: { ...process.env, HOME: process.env.HOME || '/home/lifehub-browser', XDG_RUNTIME_DIR: '/tmp/pulse' },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  pulseProcess.once('error', () => { pulseProcess = null; });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const sink = spawn('pactl', ['load-module', 'module-null-sink', 'sink_name=lifehub_sink'], {
    env: { ...process.env, PULSE_SERVER },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  sink.once('error', () => undefined);
  await new Promise((resolve) => setTimeout(resolve, 300));
}

function privateAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 0 || b === 168)) || a >= 224;
  }
  if (isIP(address) === 6) {
    const value = address.toLowerCase();
    return value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd')
      || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea')
      || value.startsWith('feb') || value.startsWith('ff');
  }
  return false;
}

function allowedInternalHost(hostname) {
  return INTERNAL_HOSTS.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
}

async function assertSafeTarget(rawUrl) {
  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error('Ungültige URL');
  }
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Nur HTTP(S) ist erlaubt');
  if (target.username || target.password) throw new Error('URLs mit Zugangsdaten sind nicht erlaubt');
  const hostname = target.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) throw new Error('Lokale Ziele sind nicht erlaubt');
  if (allowedInternalHost(hostname)) return target;
  if (privateAddress(hostname)) throw new Error('Private Netzwerkziele sind nicht erlaubt');

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.some(({ address }) => privateAddress(address))) throw new Error('URL zeigt auf ein privates Netzwerkziel');
  return target;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

/* ─── Anti-Bot-Erkennung (Cloudflare "Verify you are a Human" etc.) ───
 * Cloudflare wertet aus: (1) navigator.webdriver, (2) Cursor-Trajektorie vor
 * Klicks, (3) Klick-Timing. Ein einzelner Maus-Sprung + sofortiger Klick ist
 * ein starkes Bot-Signal — deshalb hier natürliche Bewegung + Stealth-Patches.
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Bézier-Kurve mit zufälligen Kontrollpunkten → leicht unrunde, menschliche Spur
function humanBezierPath(x0, y0, x1, y1, steps = 14) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const jitter = Math.max(6, dist * 0.15);
  const c1 = {
    x: x0 + dx * (0.2 + Math.random() * 0.25) + (Math.random() - 0.5) * jitter,
    y: y0 + dy * (0.2 + Math.random() * 0.25) + (Math.random() - 0.5) * jitter,
  };
  const c2 = {
    x: x0 + dx * (0.55 + Math.random() * 0.25) + (Math.random() - 0.5) * jitter,
    y: y0 + dy * (0.55 + Math.random() * 0.25) + (Math.random() - 0.5) * jitter,
  };
  const pts = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    pts.push({
      x: Math.round(mt * mt * mt * x0 + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * x1),
      y: Math.round(mt * mt * mt * y0 + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * y1),
    });
  }
  return pts;
}

// Natürliche Bewegung von der aktuellen Mausposition zum Ziel, mit Hover-Pause
async function humanMouseMove(page, x, y) {
  const cur = page.mouse._position || { x: DEFAULT_VIEWPORT.width / 2, y: DEFAULT_VIEWPORT.height / 2 };
  const dist = Math.hypot(x - cur.x, y - cur.y);
  if (dist < 4) {
    await page.mouse.move(x, y);
    return;
  }
  const steps = Math.min(12, Math.max(4, Math.round(dist / 40)));
  for (const p of humanBezierPath(cur.x, cur.y, x, y, steps)) {
    await page.mouse.move(p.x, p.y);
    await sleep(4 + Math.random() * 10); // 4-14ms je Schritt
  }
  await sleep(40 + Math.random() * 80); // kurze Ziel-Pause vor dem Klick
}

// Stealth-Patches pro Tab: webdriver-Flag entfernen, Chrome-Objekte vortäuschen
async function stealthify(page) {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    if (!window.chrome) window.chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}) };
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['de-DE', 'de', 'en-US', 'en'],
    });
  });
}

function rgbToI420(rgb, width, height) {
  const chromaWidth = Math.floor(width / 2);
  const chromaHeight = Math.floor(height / 2);
  const ySize = width * height;
  const chromaSize = chromaWidth * chromaHeight;
  const output = Buffer.alloc(ySize + chromaSize * 2);
  const uOffset = ySize;
  const vOffset = ySize + chromaSize;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const source = (y * width + x) * 3;
      const r = rgb[source];
      const g = rgb[source + 1];
      const b = rgb[source + 2];
      output[y * width + x] = Math.max(0, Math.min(255, Math.round(16 + 0.257 * r + 0.504 * g + 0.098 * b)));
      if ((x & 1) === 0 && (y & 1) === 0) {
        const chroma = Math.floor(y / 2) * chromaWidth + Math.floor(x / 2);
        output[uOffset + chroma] = Math.max(0, Math.min(255, Math.round(128 - 0.148 * r - 0.291 * g + 0.439 * b)));
        output[vOffset + chroma] = Math.max(0, Math.min(255, Math.round(128 + 0.439 * r - 0.368 * g - 0.071 * b)));
      }
    }
  }
  return output;
}

// Typen, die den Browser-/Tab-/Kontrollzustand ändern und daher einen
// State-Broadcast auslösen (im Gegensatz zu reinen Eingabe-Events wie Maus-Move)
const STATE_CHANGING_TYPES = new Set([
  'navigate', 'reload', 'back', 'forward', 'new-tab', 'close-tab',
  'activate-tab', 'take-control', 'release-control',
]);

class BrowserSession {
  constructor(id) {
    this.id = id;
    this.browser = null;
    this.pages = new Map();
    this.activeTabId = null;
    this.nextTabId = 1;
    this.peers = new Set();
    this.controlPeer = null;
    this.downloadPath = join(PROFILE_ROOT, id, 'downloads');
    this.lastUsed = Date.now();
    this.captureFailures = 0;
    this.captureInFlight = false;
    this.lastFrameAt = Date.now();
    this.stallTimer = null;
  }

  // Stall-Watchdog (pro Session, nicht pro Peer): Liefert der Browser länger
  // als STALL_MS keine Frames mehr, wird er HART neu gestartet (Chromium killen
  // + Session aus dem Manager entfernen). Der nächste Client-Reconnect startet
  // dann einen frischen Browser — echte Selbstheilung statt dauerhaft schwarz.
  ensureStallWatchdog() {
    if (this.stallTimer) return;
    const STALL_MS = 10_000;
    this.stallTimer = setInterval(() => {
      const stalledFor = Date.now() - this.lastFrameAt;
      if (this.peers.size > 0 && stalledFor > STALL_MS) {
        console.error(`Session [${this.id}] stalled (${Math.round(stalledFor / 1000)}s ohne Frame) — harter Neustart`);
        for (const peer of [...this.peers]) {
          try { peer.ws.close(1011, 'Session restart'); } catch { /* ignore */ }
        }
        void this.hardReset();
      }
    }, 2000);
  }

  async hardReset() {
    if (this.stallTimer) { clearInterval(this.stallTimer); this.stallTimer = null; }
    // Chromium hart beenden (graceful close kann bei eingefrorenem Browser hängen)
    try {
      if (this.browser) {
        const proc = this.browser.process?.();
        if (proc) { try { proc.kill('SIGKILL'); } catch { /* ignore */ } }
        try { await this.browser.close().catch(() => undefined); } catch { /* ignore */ }
        this.browser = null;
      }
    } catch { /* ignore */ }
    this.pages.clear();
    this.activeTabId = null;
    this.captureFailures = 0;
    this.captureInFlight = false;
    this.lastFrameAt = Date.now();
    // Aus dem Manager entfernen → nächster manager.get() erzeugt eine frische Session
    try { manager.sessions.delete(this.id); } catch { /* ignore */ }
  }

  async start(startUrl = '', initialTabs = []) {
    this.lastUsed = Date.now();
    this.lastFrameAt = Date.now();
    const wasStopped = !this.browser;
    if (!this.browser) {
      const profileDir = join(PROFILE_ROOT, this.id);
      await mkdir(profileDir, { recursive: true });
      await mkdir(this.downloadPath, { recursive: true });
      await ensurePulseAudio();
      // Verwaiste Chromium-Profil-Locks entfernen: Nach harten Container-Kills
      // (docker restart, OOM) bleiben SingletonLock/Cookie/Socket im Profil zurück
      // und Chromium verweigert den Start ("profile appears to be in use").
      for (const lock of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
        await rm(join(profileDir, lock), { force: true }).catch(() => undefined);
      }
      this.browser = await puppeteer.launch({
        headless: 'new',
        executablePath: CHROMIUM_PATH,
        userDataDir: profileDir,
        protocolTimeout: 60_000,
        downloadBehavior: { policy: 'allow', downloadPath: this.downloadPath },
        env: { ...process.env, PULSE_SERVER, PULSE_SINK: 'lifehub_sink' },
        defaultViewport: DEFAULT_VIEWPORT,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--window-size=1280,720',
          '--autoplay-policy=no-user-gesture-required',
          // Anti-Bot-Erkennung: Headless-Merkmale verbergen (Cloudflare etc.)
          '--disable-blink-features=AutomationControlled',
        ],
      });
      this.browser.on('disconnected', () => { this.browser = null; this.pages.clear(); this.activeTabId = null; });
    }

    const existingPages = await this.browser.pages();
    if (existingPages.length === 0) await this.attachPage(await this.browser.newPage());
    else for (const page of existingPages) await this.attachPage(page);

    const active = this.getActivePage();
    const hasMeaningfulPage = existingPages.some((page) => page.url() && page.url() !== 'about:blank' && !page.url().startsWith('chrome://newtab'));
    let restoredTab = false;
    if (wasStopped && !hasMeaningfulPage && initialTabs.length > 0) {
      const [first, ...rest] = initialTabs;
      if (first?.url && first.url !== 'about:blank') {
        await this.navigate(first.url);
        restoredTab = true;
      }
      for (const tab of rest) {
        if (tab?.url && tab.url !== 'about:blank') {
          await this.newTab(tab.url);
          restoredTab = true;
        }
      }
    }
    if (!restoredTab && active && startUrl && (active.url() === 'about:blank' || active.url() === '')) {
      await this.navigate(startUrl);
    }
    await this.broadcastState();
    return this.state();
  }

  async attachPage(page) {
    for (const [tabId, existing] of this.pages) if (existing === page) return tabId;
    const tabId = `tab-${this.nextTabId++}`;
    this.pages.set(tabId, page);
    await stealthify(page); // Anti-Bot-Patches auf jedem Tab
    await page.setViewport(DEFAULT_VIEWPORT).catch(() => undefined);
    page.on('close', () => {
      this.pages.delete(tabId);
      if (this.activeTabId === tabId) this.activeTabId = this.pages.keys().next().value || null;
      void this.broadcastState();
    });
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) void this.broadcastState();
    });
    page.on('popup', (popup) => { void this.attachPage(popup).then(() => this.broadcastState()); });
    if (!this.activeTabId) this.activeTabId = tabId;
    return tabId;
  }

  getActivePage() {
    return this.pages.get(this.activeTabId) || this.pages.values().next().value || null;
  }

  async state() {
    const tabs = [];
    for (const [id, page] of this.pages) {
      tabs.push({
        id,
        url: page.url(),
        title: await page.title().catch(() => ''),
        isActive: id === this.activeTabId,
      });
    }
    return { sessionId: this.id, activeTabId: this.activeTabId, tabs, status: this.browser ? 'running' : 'stopped' };
  }

  async navigate(rawUrl) {
    const target = await assertSafeTarget(rawUrl);
    const page = this.getActivePage();
    if (!page) throw new Error('Kein Browser-Tab verfügbar');
    this.lastUsed = Date.now();
    await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await this.broadcastState();
    return this.state();
  }

  async newTab(rawUrl = 'https://www.google.com') {
    const target = rawUrl === 'about:blank' ? rawUrl : (await assertSafeTarget(rawUrl)).href;
    const page = await this.browser.newPage();
    const tabId = await this.attachPage(page);
    this.activeTabId = tabId;
    if (target !== 'about:blank') await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await this.broadcastState();
    return this.state();
  }

  async activate(tabId) {
    if (!this.pages.has(tabId)) throw new Error('Browser-Tab nicht gefunden');
    this.activeTabId = tabId;
    await this.pages.get(tabId).bringToFront().catch(() => undefined);
    await this.broadcastState();
    return this.state();
  }

  async closeTab(tabId) {
    const page = this.pages.get(tabId);
    if (!page) return this.state();
    await page.close();
    return this.state();
  }

  async resize(width, height) {
    const page = this.getActivePage();
    if (!page) return;
    await page.setViewport({ width: clamp(width, 320, 2560), height: clamp(height, 240, 1600) });
  }

  async input(peer, message) {
    this.lastUsed = Date.now();
    if (message.type === 'take-control') {
      this.controlPeer = peer;
      await this.broadcastState();
      return;
    }
    if (message.type === 'release-control') {
      if (this.controlPeer === peer) this.controlPeer = this.peers.values().next().value || null;
      await this.broadcastState();
      return;
    }
    // Auto-Take-Control: Jede Interaktion eines Nicht-Control-Peers übernimmt
    // die Kontrolle. Verhindert den "erster Peer blockiert alle Klicks"-Zustand
    // (z.B. nach Browser-Tab-Wechsel oder wenn ein alter Tab offen bleibt).
    if (peer !== this.controlPeer) {
      this.controlPeer = peer;
      await this.broadcastState();
    }
    const page = this.getActivePage();
    if (message.type === 'navigate') return this.navigate(message.url);
    if (message.type === 'new-tab') return this.newTab(message.url || 'about:blank');
    if (message.type === 'activate-tab') return this.activate(message.tabId);
    if (message.type === 'close-tab') return this.closeTab(message.tabId);
    if (message.type === 'reload') { await page?.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 }); return this.broadcastState(); }
    if (message.type === 'back') { await page?.goBack({ waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => undefined); return this.broadcastState(); }
    if (message.type === 'forward') { await page?.goForward({ waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => undefined); return this.broadcastState(); }
    if (!page) return undefined;

    if (message.type === 'resize') return this.resize(message.width, message.height);
    if (message.type === 'mouse') {
      const x = clamp(message.x, 0, DEFAULT_VIEWPORT.width);
      const y = clamp(message.y, 0, DEFAULT_VIEWPORT.height);
      // Natürliche Trajektorie: Klicks fahren eine Bézier-Kurve mit
      // Hover-Pause ab, statt mit einem Sprung ans Ziel zu springen
      // (Cloudflare wertet die Cursor-Bewegung vor dem Klick aus).
      // 'move'-Events vom Frontend sind echte User-Bewegungen → direkt.
      if (message.action === 'move') await page.mouse.move(x, y);
      if (message.action === 'down') { await humanMouseMove(page, x, y); await page.mouse.down({ button: message.button || 'left' }); }
      if (message.action === 'up') { await page.mouse.move(x, y); await page.mouse.up({ button: message.button || 'left' }); }
      if (message.action === 'click') {
        await humanMouseMove(page, x, y);
        await page.mouse.down({ button: message.button || 'left' });
        await sleep(40 + Math.random() * 120);
        await page.mouse.up({ button: message.button || 'left' });
      }
    }
    if (message.type === 'wheel') await page.mouse.wheel({ deltaX: Number(message.deltaX) || 0, deltaY: Number(message.deltaY) || 0 });
    if (message.type === 'keyboard') {
      if (message.action === 'type') await page.keyboard.type(String(message.text || ''));
      if (message.action === 'press') await page.keyboard.press(String(message.key));
      if (message.action === 'down') await page.keyboard.down(String(message.key));
      if (message.action === 'up') await page.keyboard.up(String(message.key));
    }
  }

  async captureFrame() {
    const page = this.getActivePage();
    if (!page) return null;
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 65 });
    const raw = await sharp(screenshot).raw().toBuffer({ resolveWithObject: true });
    const width = raw.info.width - (raw.info.width % 2);
    const height = raw.info.height - (raw.info.height % 2);
    return { width, height, data: rgbToI420(raw.data, raw.info.width, raw.info.height) };
  }

  async downloads() {
    const entries = await readdir(this.downloadPath, { withFileTypes: true }).catch(() => []);
    const result = [];
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.startsWith('.')) continue;
      const path = join(this.downloadPath, entry.name);
      const details = await stat(path).catch(() => null);
      if (!details) continue;
      result.push({
        filename: entry.name,
        size: details.size,
        status: entry.name.endsWith('.crdownload') ? 'in_progress' : details.size > MAX_DOWNLOAD_BYTES ? 'too_large' : 'complete',
        updatedAt: details.mtime.toISOString(),
      });
    }
    return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async downloadPathFor(filename) {
    if (!filename || filename !== basename(filename) || filename.includes('\0')) throw new Error('Ungültiger Dateiname');
    const path = join(this.downloadPath, filename);
    const details = await stat(path).catch(() => null);
    if (!details?.isFile()) throw new Error('Download nicht gefunden');
    if (details.size > MAX_DOWNLOAD_BYTES) throw new Error('Download überschreitet das Größenlimit');
    return { path, size: details.size };
  }

  async addPeer(ws) {
    const source = new RTCVideoSource();
    const pc = new RTCPeerConnection({ iceServers: [] });
    const peer = { ws, pc, source, audioSource: null, audioProcess: null, audioBuffer: Buffer.alloc(0), timer: null, channel: null };
    this.peers.add(peer);
    if (!this.controlPeer) this.controlPeer = peer;
    pc.addTrack(source.createTrack());
    try {
      const audioSource = new RTCAudioSource();
      const audioProcess = spawn('ffmpeg', [
        '-hide_banner', '-loglevel', 'error',
        '-f', 'pulse', '-i', 'lifehub_sink.monitor',
        '-ac', '2', '-ar', '48000', '-f', 's16le', 'pipe:1',
      ], { env: { ...process.env, PULSE_SERVER }, stdio: ['ignore', 'pipe', 'ignore'] });
      peer.audioSource = audioSource;
      peer.audioProcess = audioProcess;
      audioProcess.once('error', () => undefined);
      audioProcess.stdout.on('data', (chunk) => {
        peer.audioBuffer = Buffer.concat([peer.audioBuffer, chunk]);
        const frameBytes = 480 * 2 * 2;
        while (peer.audioBuffer.length >= frameBytes) {
          const frame = peer.audioBuffer.subarray(0, frameBytes);
          const samples = new Int16Array(frameBytes / 2);
          for (let index = 0; index < samples.length; index += 1) samples[index] = frame.readInt16LE(index * 2);
          audioSource.onData({ samples, sampleRate: 48000, bitsPerSample: 16, channelCount: 2, numberOfFrames: 480 });
          peer.audioBuffer = peer.audioBuffer.subarray(frameBytes);
        }
        if (peer.audioBuffer.length > frameBytes * 20) peer.audioBuffer = peer.audioBuffer.subarray(-frameBytes * 2);
      });
      pc.addTrack(audioSource.createTrack());
    } catch {
      // Video remains usable when the optional PulseAudio/FFmpeg path is unavailable.
    }
    pc.onicecandidate = ({ candidate }) => { if (candidate && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'candidate', candidate })); };
    pc.ondatachannel = ({ channel }) => {
      peer.channel = channel;
      channel.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data));
          console.error(`DC-MSG [${this.id}]:`, JSON.stringify(message).slice(0, 160));
          void this.input(peer, message).then(() => {
            // State-Broadcast nur bei Tab-/Kontroll-Änderungen — nicht bei jedem
            // Maus-Move (sonst Serialisierung + Latenz bei jeder Bewegung).
            if (STATE_CHANGING_TYPES.has(message.type)) void this.sendState(ws);
          }).catch((error) => {
            console.error('DC-Input failed:', error.message);
          });
        } catch (error) {
          console.error('DC-Malformed:', error.message);
        }
      };
    };
    // Handshake-Timeout: 20s nach Peer-Aufbau. Wenn die Verbindung bis dahin
    // nicht steht, den Peer schließen — der Client baut die Verbindung neu auf.
    peer.handshakeTimeout = setTimeout(() => {
      if (peer.pc.connectionState !== 'connected') {
        console.error(`Handshake timeout [${this.id}] — Peer schließen`);
        try { ws.close(1011, 'Handshake timeout'); } catch { /* ignore */ }
      }
    }, 20_000);
    peer.pc.onconnectionstatechange = () => {
      if (peer.pc.connectionState === 'connected' && peer.handshakeTimeout) {
        clearTimeout(peer.handshakeTimeout);
        peer.handshakeTimeout = null;
      }
    };
    const capture = async () => {
      // Lock: kein überlappender Screenshot. Wenn Chromium hängt (Screenshot
      // läuft ewig), würde setInterval sonst parallel Screenshots stapeln und
      // die Last weiter erhöhen — das verschlimmert das Problem.
      if (this.captureInFlight) return;
      this.captureInFlight = true;
      try {
        const frame = await this.captureFrame();
        if (frame) {
          source.onFrame(frame);
          this.captureFailures = 0;
          this.lastFrameAt = Date.now();
        }
      } catch (error) {
        this.captureFailures += 1;
        console.error(`Frame capture failed [${this.id}] (${this.captureFailures}x): ${error.message}`);
        // Nach ~6s anhaltender Fehler (12 × 500ms) den Peer schließen →
        // der Client baut die Verbindung automatisch neu auf.
        if (this.captureFailures >= 12) {
          console.error(`Closing peer [${this.id}] after ${this.captureFailures} capture failures`);
          try { ws.close(1011, 'Frame capture stalled'); } catch { /* ignore */ }
        }
      } finally {
        this.captureInFlight = false;
      }
    };
    // 500ms = 4 FPS: für UI-Browsing ausreichend und halbiert die CPU-Last
    // (mehrere Browser-Blöcke = mehrere parallele Screenshot-Timer).
    peer.timer = setInterval(() => void capture(), 500);
    this.ensureStallWatchdog();
    ws.on('message', (raw) => {
      try {
        console.error('WS-MSG:', String(raw).slice(0, 120));
        void this.handleSignal(peer, JSON.parse(raw.toString())).catch((error) => {
          console.error('Signaling failed:', error.message);
        });
      } catch (error) {
        if (process.env.LOG_LEVEL === 'debug') console.error('Malformed signaling message', error.message);
      }
    });
    ws.on('close', () => this.removePeer(peer));
    ws.on('error', () => this.removePeer(peer));
    // Heartbeat: tote Verbindungen erkennen (TCP-Timeout kann Minuten dauern).
    // Kein Pong nach 2 Zyklen → terminate() → removePeer() → cleanup() kann die
    // Session beenden. Ohne dies bleiben verwaiste Peers ewig in der Session.
    let missedPongs = 0;
    peer.heartbeat = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return;
      missedPongs += 1;
      if (missedPongs > 2) {
        console.error(`Heartbeat timeout [${this.id}] — Peer beendet`);
        ws.terminate();
        return;
      }
      ws.ping();
    }, 30_000);
    ws.on('pong', () => { missedPongs = 0; });
    await this.sendState(ws);
  }

  async handleSignal(peer, message) {
    if (message.type === 'offer') {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(message.offer));
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      peer.ws.send(JSON.stringify({ type: 'answer', answer }));
    } else if (message.type === 'candidate' && message.candidate) {
      await peer.pc.addIceCandidate(new RTCIceCandidate(message.candidate));
    } else if (message.type === 'input') {
      await this.input(peer, message.payload);
      if (STATE_CHANGING_TYPES.has(message.payload?.type)) await this.sendState(peer.ws);
    }
  }

  removePeer(peer) {
    if (!this.peers.delete(peer)) return;
    if (this.controlPeer === peer) this.controlPeer = this.peers.values().next().value || null;
    if (peer.timer) clearInterval(peer.timer);
    if (peer.heartbeat) clearInterval(peer.heartbeat);
    if (peer.handshakeTimeout) clearTimeout(peer.handshakeTimeout);
    peer.audioProcess?.kill();
    peer.source.stop?.();
    peer.pc.close();
    void this.broadcastState();
  }

  async stateForPeer(peer) {
    return { ...(await this.state()), canControl: this.controlPeer === peer, controlHeld: Boolean(this.controlPeer) };
  }

  async sendState(ws) {
    if (ws.readyState !== WebSocket.OPEN) return;
    const peer = [...this.peers].find((candidate) => candidate.ws === ws);
    ws.send(JSON.stringify({ type: 'state', state: await this.stateForPeer(peer) }));
  }

  async broadcastState() {
    for (const peer of this.peers) await this.sendState(peer.ws);
  }

  async close() {
    if (this.stallTimer) { clearInterval(this.stallTimer); this.stallTimer = null; }
    for (const peer of this.peers) this.removePeer(peer);
    this.controlPeer = null;
    if (this.browser) await this.browser.close().catch(() => undefined);
    this.browser = null;
    this.pages.clear();
    this.activeTabId = null;
  }
}

class BrowserSessionManager {
  constructor() { this.sessions = new Map(); }

  async get(rawId) {
    const id = assertSessionId(rawId);
    let session = this.sessions.get(id);
    if (!session) {
      session = new BrowserSession(id);
      this.sessions.set(id, session);
    }
    await session.start();
    return session;
  }

  async start(rawId, startUrl, { forceNavigate = false, initialTabs = [] } = {}) {
    const id = assertSessionId(rawId);
    let session = this.sessions.get(id);
    if (!session) {
      session = new BrowserSession(id);
      this.sessions.set(id, session);
    }
    await session.start(startUrl, initialTabs);
    if (forceNavigate && startUrl) await session.navigate(startUrl);
    return session;
  }

  async cleanup() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (session.peers.size === 0 && now - session.lastUsed > SESSION_IDLE_MS) {
        await session.close();
        this.sessions.delete(id);
      }
    }
  }
}

const manager = new BrowserSessionManager();
const wss = new WebSocketServer({ noServer: true });

function authorised(req) {
  return Boolean(RENDERER_KEY) && req.headers['x-lifehub-renderer-key'] === RENDERER_KEY;
}

async function body(req) {
  let value = '';
  for await (const chunk of req) {
    value += chunk;
    if (value.length > 1_000_000) throw new Error('Request body too large');
  }
  return value ? JSON.parse(value) : {};
}

async function legacyContent(targetUrl) {
  const session = await manager.start('legacy', targetUrl, { forceNavigate: true });
  const page = session.getActivePage();
  await new Promise((resolve) => setTimeout(resolve, 500));
  return page.content();
}

async function requestHandler(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  if (requestUrl.pathname === '/health' && req.method === 'GET') return json(res, 200, { status: 'ok' });
  if (!authorised(req)) return json(res, 401, { error: 'Unauthorized' });

  try {
    const startMatch = requestUrl.pathname.match(/^\/sessions\/([^/]+)\/start$/);
    if (startMatch && req.method === 'POST') {
      const payload = await body(req);
      const initialTabs = Array.isArray(payload.tabs)
        ? payload.tabs.slice(0, 32).map((tab) => ({ url: String(tab?.url || ''), title: String(tab?.title || '') }))
        : [];
      const session = await manager.start(startMatch[1], payload.startUrl || '', { initialTabs });
      return json(res, 200, { sessionId: session.id, status: 'running', ...(await session.state()) });
    }

    const stateMatch = requestUrl.pathname.match(/^\/sessions\/([^/]+)\/state$/);
    if (stateMatch && req.method === 'GET') return json(res, 200, await (await manager.get(stateMatch[1])).state());

    const downloadsMatch = requestUrl.pathname.match(/^\/sessions\/([^/]+)\/downloads$/);
    if (downloadsMatch && req.method === 'GET') return json(res, 200, await (await manager.get(downloadsMatch[1])).downloads());

    const downloadMatch = requestUrl.pathname.match(/^\/sessions\/([^/]+)\/downloads\/([^/]+)$/);
    if (downloadMatch && req.method === 'GET') {
      const file = await (await manager.get(downloadMatch[1])).downloadPathFor(decodeURIComponent(downloadMatch[2]));
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': file.size,
        'Content-Disposition': `attachment; filename="${basename(file.path).replace(/[\"\r\n]/g, '')}"`,
      });
      return createReadStream(file.path).pipe(res);
    }

    if (requestUrl.pathname === '/content' && req.method === 'POST') {
      const payload = await body(req);
      const target = await assertSafeTarget(payload.url);
      const html = await legacyContent(target.href);
      return json(res, 200, { html });
    }

    if (requestUrl.pathname === '/screenshot' && req.method === 'POST') {
      const payload = await body(req);
      const target = await assertSafeTarget(payload.url);
      const session = await manager.start('legacy', target.href, { forceNavigate: true });
      const image = await session.getActivePage().screenshot({ type: 'png' });
      res.writeHead(200, { 'Content-Type': 'image/png' });
      return res.end(image);
    }
    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    return json(res, 400, { error: error.message || 'Browser request failed' });
  }
}

const server = createServer((req, res) => { void requestHandler(req, res); });
server.on('upgrade', (req, socket, head) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const match = requestUrl.pathname.match(/^\/session\/([^/]+)\/webrtc$/);
  const token = requestUrl.searchParams.get('token');
  let sessionId;
  try { sessionId = match ? assertSessionId(match[1]) : null; } catch { sessionId = null; }
  if (!sessionId || !RENDERER_KEY || !verifyRendererToken(sessionId, token, RENDERER_KEY)) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, async (ws) => {
    // Nachrichten VOR manager.get() puffern: manager.get() kann bei neuen
    // Sessions Sekunden dauern (Browser-Start). Die ws-Bibliothek feuert
    // 'message' nur bei registrierten Listenern — ohne Puffer geht das
    // erste Offer verloren und der WebRTC-Handshake hängt.
    const pending = [];
    const buffer = (raw) => pending.push(raw);
    ws.on('message', buffer);
    try {
      const session = await manager.get(sessionId);
      await session.addPeer(ws);
      ws.off('message', buffer);
      for (const raw of pending) ws.emit('message', raw);
    } catch {
      ws.close(1011, 'Session unavailable');
    }
  });
});

setInterval(() => { void manager.cleanup(); }, 60_000);
await mkdir(PROFILE_ROOT, { recursive: true });
server.listen(PORT, '0.0.0.0', () => console.log(`Browser renderer listening on http://0.0.0.0:${PORT}`));
