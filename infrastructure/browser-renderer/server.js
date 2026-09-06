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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

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
// DPR > 1 rendert Chromium mit höherer Pixeldichte; das <video> skaliert auf
// CSS-Größe herunter → scharfes Bild. Kosten: ~dpr² Pixel für Decode + VP8.
const DEFAULT_DPR = clamp(process.env.BROWSER_DPR ?? 1.5, 1, 2);
// CDP-Screencast liefert jeden Paint; ohne Gate würde eine animierte Seite die
// CPU mit 60 FPS Decode+Encode belegen. 30 FPS reichen für flüssige Interaktion.
const MAX_FPS = clamp(process.env.BROWSER_MAX_FPS ?? 30, 5, 60);
const FRAME_MIN_INTERVAL_MS = Math.floor(1000 / MAX_FPS);
// Headful-Modus (Chromium unter Xvfb, via start.sh) — echt wirkender
// Browser-Fingerprint als Basis für Captcha-/Bot-Detection.
const HEADFUL = process.env.BROWSER_HEADFUL === '1';
const DEFAULT_START_URL = 'https://www.google.com/';
const LOG_DEBUG = process.env.LOG_LEVEL === 'debug';
const AUDIO_ENABLED = process.env.BROWSER_AUDIO === '1';
const INTERNAL_HOSTS = (process.env.BROWSER_INTERNAL_HOSTS || '')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);
// Wenn gesetzt (z.B. "https://lifehub.example,http://localhost:3100"): WS-Upgrade
// nur für diese Origins. Leer = kein Restrict (Bestehende Setups nicht brechen).
const ALLOWED_ORIGINS = (process.env.BROWSER_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
// Mausbewegungen werden sofort entgegengenommen und gebündelt alle ~16ms an
// Chromium übergeben (60Hz last-write-wins). Jedes einzeln über CDP dispatchen
// würde bei 120Hz-Mäusen die CDP-Pipeline fluten, ohne visuellen Nutzen.
const MOVE_FLUSH_MS = 16;

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

/* ─── Egress-Guard mit DNS-Cache ───
 * Prüft Hostnamen gegen private/lokale Bereiche (SSRF-Schutz). Wird von
 * assertSafeTarget (Navigations-Start) UND vom Request-Interceptor (jeder
 * Subrequest, Redirect, Popup) genutzt — damit können Navigationsziele nicht
 * mehr auf private Netze umlenken. DNS-Antworten werden 60s gecacht, damit
 * der Interceptor keine DNS-Flut erzeugt.
 */
const EGRESS_CACHE_TTL_MS = 60_000;
const egressCache = new Map();

async function assertHostAllowed(hostname) {
  const key = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  const cached = egressCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    if (!cached.ok) throw new Error(`Ziel-Host "${key}" ist nicht erlaubt`);
    return;
  }

  let ok = true;
  try {
    if (!key || key === 'localhost' || key.endsWith('.localhost')) ok = false;
    else if (allowedInternalHost(key)) ok = true;
    else if (privateAddress(key)) ok = false;
    else {
      const addresses = await lookup(key, { all: true, verbatim: true });
      if (addresses.some(({ address }) => privateAddress(address))) ok = false;
    }
  } catch {
    ok = false; // DNS-Fehler → sicher blocken
  }

  if (egressCache.size > 1000) egressCache.clear();
  egressCache.set(key, { ok, expiresAt: Date.now() + EGRESS_CACHE_TTL_MS });
  if (!ok) throw new Error(`Ziel-Host "${key}" ist nicht erlaubt`);
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
  await assertHostAllowed(target.hostname);
  return target;
}

/* ─── Anti-Bot-Erkennung (Cloudflare "Verify you are a Human" etc.) ───
 * Die echte Maus-Trajektorie kommt jetzt 1:1 und in Echtzeit vom User
 * (lückenloses Forwarding, siehe queueMove) — sie ist damit bereits
 * "menschlich". Der Bézier-Pfad bleibt nur noch für den legacy 'click'-
 * Befehl (vollsynthetischer Klick ohne vorherige Move-Spur) erhalten.
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
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const mt = 1 - t;
    pts.push({
      x: Math.round(mt * mt * mt * x0 + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * x1),
      y: Math.round(mt * mt * mt * y0 + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * y1),
    });
  }
  return pts;
}

// Synthetische Bewegung von der aktuellen Position zum Ziel (nur legacy 'click')
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

// RGB (3 Bytes/Pixel) → I420 (YUV 4:2:0) für den WebRTC-Encoder.
// Ergebnis ist immer gerade Dimensionen (Voraussetzung für 4:2:0).
function rgbToI420(rgb, srcWidth, srcHeight) {
  const width = srcWidth - (srcWidth % 2);
  const height = srcHeight - (srcHeight % 2);
  const chromaWidth = width / 2;
  const chromaHeight = height / 2;
  const ySize = width * height;
  const output = Buffer.alloc(ySize + chromaWidth * chromaHeight * 2);
  const uOffset = ySize;
  const vOffset = ySize + chromaWidth * chromaHeight;

  for (let y = 0; y < height; y += 1) {
    const srcRow = y * srcWidth;
    for (let x = 0; x < width; x += 1) {
      const source = (srcRow + x) * 3;
      const r = rgb[source];
      const g = rgb[source + 1];
      const b = rgb[source + 2];
      output[srcRow + x] = Math.max(0, Math.min(255, Math.round(16 + 0.257 * r + 0.504 * g + 0.098 * b)));
      if ((x & 1) === 0 && (y & 1) === 0) {
        const chroma = (y / 2) * chromaWidth + x / 2;
        output[uOffset + chroma] = Math.max(0, Math.min(255, Math.round(128 - 0.148 * r - 0.291 * g + 0.439 * b)));
        output[vOffset + chroma] = Math.max(0, Math.min(255, Math.round(128 + 0.439 * r - 0.368 * g - 0.071 * b)));
      }
    }
  }
  return { width, height, data: output };
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
    this.lastInputAt = 0;
    this.lastFrameAt = Date.now();
    this.lastRealFrameAt = Date.now();
    this.lastSentFrameAt = 0;
    this.frameCount = 0;
    this.lastFrame = null;
    this.screencast = null; // { page, client, failures }
    this.stallTimer = null;
    this.probing = false;
    // Serielle Kette: moveChain für Mausbewegungen (60Hz-Pacer). Schnelle Ops
    // (down/up/wheel/keyboard) laufen über die inputQueue des jeweiligen Peers —
    // Navigation läuft bewusst NEBEN jeder Queue und blockiert keine Eingaben.
    this.moveChain = Promise.resolve();
    // Letzter erfolgreicher CDP-Probe — Backoff für probeAndRecover (siehe dort).
    this.lastProbeOkAt = 0;
  }

  get viewport() {
    return this._viewport || { width: DEFAULT_VIEWPORT.width, height: DEFAULT_VIEWPORT.height, dpr: DEFAULT_DPR };
  }

  set viewport(next) {
    this._viewport = next;
  }

  /* ─── Screencast: CDP Page.startScreencast ───
   * Event-getrieben: Chromium sendet nur Frames bei tatsächlichem Repaint
   * (bis MAX_FPS), in voller Viewport-Auflösung × DPR. Kein Screenshot-Polling,
   * keine 960px-Kappung, im Leerlauf kein CPU-Verbrauch.
   */
  async startScreencast(page, { force = false } = {}) {
    const target = page || this.getActivePage();
    // Kein Ziel (keine Tabs offen): evtl. noch laufende CDP-Session stoppen,
    // sonst leckt der alte Screencast-Eintrag weiter.
    if (!target) {
      await this.stopScreencast();
      return;
    }
    // Läuft der Screencast schon auf diesem Tab MIT den aktuellen Auflösungs-
    // Caps, ist kein Neustart nötig (idempotent). force erzwingt Restart —
    // nötig nach resize(), weil sich maxWidth/maxHeight geändert haben.
    const capsW = Math.round(this.viewport.width * this.viewport.dpr);
    const capsH = Math.round(this.viewport.height * this.viewport.dpr);
    if (!force && this.screencast?.page === target
      && this.screencast.capsW === capsW && this.screencast.capsH === capsH) return;
    await this.stopScreencast();
    let client;
    try {
      client = await target.createCDPSession();
    } catch (error) {
      console.error(`Screencast-CDP-Session failed [${this.id}]: ${error.message}`);
      return;
    }
    const entry = { page: target, client, failures: 0, capsW, capsH };
    this.screencast = entry;

    client.on('Page.screencastFrame', (frame) => {
      if (this.screencast !== entry) return; // veraltete Session
      // Jeder Frame MUSS ge-ackt werden, sonst drosselt CDP den Stream.
      entry.client.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => undefined);
      const now = Date.now();
      if (now - this.lastSentFrameAt < FRAME_MIN_INTERVAL_MS) return; // FPS-Gate
      this.lastSentFrameAt = now;
      void this.encodeAndBroadcast(Buffer.from(frame.data, 'base64'));
    });

    client.on('error', () => {
      entry.failures += 1;
      if (entry.failures === 1) {
        // Einmaliger Neustart-Versuch nach kurzer Pause (Chromium-Reset etc.)
        setTimeout(() => {
          if (this.screencast === entry) void this.startScreencast();
        }, 500);
      }
      if (entry.failures >= 10) {
        console.error(`Screencast persistent failing [${this.id}] — Peers schließen (Client-Reconnect)`);
        for (const peer of [...this.peers]) {
          try { peer.ws.close(1011, 'Screencast failure'); } catch { /* ignore */ }
        }
      }
    });

    try {
      await client.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 70,
        maxWidth: Math.round(this.viewport.width * this.viewport.dpr),
        maxHeight: Math.round(this.viewport.height * this.viewport.dpr),
        everyNthFrame: 1,
      });
      console.log(`Screencast started [${this.id}] @ ${this.viewport.width}x${this.viewport.height} dpr=${this.viewport.dpr}`);
    } catch (error) {
      console.error(`Page.startScreencast failed [${this.id}]: ${error.message}`);
    }
  }

  async stopScreencast() {
    const entry = this.screencast;
    this.screencast = null;
    if (!entry) return;
    try { await entry.client.send('Page.stopScreencast'); } catch { /* ignore */ }
    try { entry.client.removeAllListeners('Page.screencastFrame'); } catch { /* ignore */ }
    try { entry.client.removeAllListeners('error'); } catch { /* ignore */ }
    try { await entry.client.detach(); } catch { /* ignore */ }
  }

  async encodeAndBroadcast(jpeg) {
    try {
      const raw = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });
      const frame = rgbToI420(raw.data, raw.info.width, raw.info.height);
      this.lastFrame = frame;
      this.lastRealFrameAt = Date.now();
      this.lastFrameAt = Date.now();
      this.lastProbeOkAt = 0; // echte Frames → Probe-Backoff zurücksetzen
      this.frameCount += 1;
      if (LOG_DEBUG && this.frameCount % 150 === 0) {
        console.log(`Frames sent [${this.id}]: ${this.frameCount}`);
      }
      for (const peer of this.peers) {
        try { peer.source.onFrame(frame); } catch { /* ignore */ }
      }
    } catch (error) {
      console.error(`Frame encode failed [${this.id}]: ${error.message}`);
    }
  }

  // Stall-Watchdog (pro Session): Eine statische Seite erzeugt mit dem
  // Screencast legitimal lange keine neuen Frames — das ist KEIN Stall.
  // Probiert wird deshalb Chromium selbst: antwortet CDP nicht mehr (eingefrorener
  // Renderer), hart neu starten; sonst läuft der Keepalive-Replay weiter.
  ensureStallWatchdog() {
    if (this.stallTimer) return;
    const STALL_MS = 10_000;
    this.stallTimer = setInterval(() => {
      if (this.peers.size === 0) return;
      if (Date.now() - this.lastRealFrameAt <= STALL_MS) return;
      void this.probeAndRecover();
    }, 2000);
  }

  async probeAndRecover() {
    if (this.probing) return;
    // Backoff: Statische Seiten prodden sonst alle 2s für immer. Nach einem
    // erfolgreichen Probe höchstens alle 30s erneut prüfen.
    if (this.lastProbeOkAt && Date.now() - this.lastProbeOkAt < 30_000) return;
    this.probing = true;
    try {
      const client = this.screencast?.client;
      if (!client) return;
      await Promise.race([
        client.send('Runtime.evaluate', { expression: '1', returnByValue: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('CDP ping timeout')), 3000)),
      ]);
      this.lastProbeOkAt = Date.now();
    } catch {
      console.error(`Session [${this.id}] stalled (CDP antwortet nicht) — harter Neustart`);
      for (const peer of [...this.peers]) {
        try { peer.ws.close(1011, 'Session restart'); } catch { /* ignore */ }
      }
      await this.hardReset();
    } finally {
      this.probing = false;
    }
  }

  async hardReset() {
    if (this.stallTimer) { clearInterval(this.stallTimer); this.stallTimer = null; }
    await this.stopScreencast();
    // Peers schließen (triggert removePeer inkl. Timer-/Socket-Cleanup), sonst
    // bleiben verwaiste Sockets/Timer nach dem Manager-Delete zurück.
    for (const peer of [...this.peers]) {
      try { peer.ws.close(1011, 'Session reset'); } catch { /* ignore */ }
      this.removePeer(peer);
    }
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
    this.lastFrame = null;
    this.lastRealFrameAt = Date.now();
    this.lastFrameAt = Date.now();
    this.lastProbeOkAt = 0;
    this.moveChain = Promise.resolve();
    // Aus dem Manager entfernen → nächster manager.get() erzeugt eine frische Session
    try { manager.sessions.delete(this.id); } catch { /* ignore */ }
  }

  async start(startUrl = '', initialTabs = []) {
    this.lastUsed = Date.now();
    this.lastFrameAt = Date.now();
    this.lastRealFrameAt = Date.now();
    const wasStopped = !this.browser;
    if (!this.browser) {
      const profileDir = join(PROFILE_ROOT, this.id);
      await mkdir(profileDir, { recursive: true });
      await mkdir(this.downloadPath, { recursive: true });
      if (AUDIO_ENABLED) await ensurePulseAudio();
      // Verwaiste Chromium-Profil-Locks entfernen: Nach harten Container-Kills
      // (docker restart, OOM) bleiben SingletonLock/Cookie/Socket im Profil zurück
      // und Chromium verweigert den Start ("profile appears to be in use").
      for (const lock of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
        await rm(join(profileDir, lock), { force: true }).catch(() => undefined);
      }
      this.browser = await puppeteer.launch({
        headless: HEADFUL ? false : 'new',
        executablePath: CHROMIUM_PATH,
        userDataDir: profileDir,
        protocolTimeout: 60_000,
        downloadBehavior: { policy: 'allow', downloadPath: this.downloadPath },
        env: { ...process.env, PULSE_SERVER, PULSE_SINK: 'lifehub_sink' },
        defaultViewport: { width: this.viewport.width, height: this.viewport.height, deviceScaleFactor: this.viewport.dpr },
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          `--window-size=${DEFAULT_VIEWPORT.width},${DEFAULT_VIEWPORT.height}`,
          '--autoplay-policy=no-user-gesture-required',
          // Anti-Bot-Erkennung: Headless-Merkmale verbergen (Cloudflare etc.)
          '--disable-blink-features=AutomationControlled',
        ],
      });
      this.browser.on('disconnected', () => {
        this.browser = null;
        this.pages.clear();
        this.activeTabId = null;
        void this.stopScreencast();
      });
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
    if (!restoredTab && active && (active.url() === 'about:blank' || active.url() === '')) {
      await this.navigate(startUrl || DEFAULT_START_URL);
    }
    await this.startScreencast(active);
    await this.broadcastState();
    return this.state();
  }

  async attachPage(page) {
    for (const [tabId, existing] of this.pages) if (existing === page) return tabId;
    const tabId = `tab-${this.nextTabId++}`;
    this.pages.set(tabId, page);
    await stealthify(page); // Anti-Bot-Patches auf jedem Tab
    await page.setViewport({
      width: this.viewport.width,
      height: this.viewport.height,
      deviceScaleFactor: this.viewport.dpr,
    }).catch(() => undefined);

    // Egress-Guard auf JEDEM Request (Subresources, Redirects, Popups):
    // blockt Ziele in private/lokale Netze, auch nach erfolgreicher Erst-Prüfung.
    await page.setRequestInterception(true).catch(() => undefined);
    page.on('request', (request) => {
      const url = request.url();
      if (!/^https?:/i.test(url)) {
        void request.continue().catch(() => undefined);
        return;
      }
      let hostname;
      try {
        hostname = new URL(url).hostname;
      } catch {
        void request.abort('failed').catch(() => undefined);
        return;
      }
      assertHostAllowed(hostname)
        .then(() => request.continue().catch(() => undefined))
        .catch(() => request.abort('blocked').catch(() => undefined));
    });

    page.on('close', () => {
      this.pages.delete(tabId);
      if (this.activeTabId === tabId) this.activeTabId = this.pages.keys().next().value || null;
      if (this.screencast?.page === page) void this.startScreencast();
      void this.broadcastState();
    });
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) void this.broadcastState();
    });
    // Popups erben den Egress-Guard via Request-Interceptor (wird in
    // attachPage gesetzt, bevor die Popup-Navigation startet).
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
    return {
      sessionId: this.id,
      activeTabId: this.activeTabId,
      tabs,
      status: this.browser ? 'running' : 'stopped',
      // Aktiver Viewport: Client mappt Maus-Koordinaten darauf (kann durch
      // resize-Nachrichten vom Initialwert abweichen).
      viewport: { width: this.viewport.width, height: this.viewport.height },
    };
  }

  async navigate(rawUrl) {
    const target = await assertSafeTarget(rawUrl);
    const page = this.getActivePage();
    if (!page) throw new Error('Kein Browser-Tab verfügbar');
    this.lastUsed = Date.now();
    await this.releaseButtons();
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
    await this.startScreencast(page);
    await this.broadcastState();
    return this.state();
  }

  async activate(tabId) {
    if (!this.pages.has(tabId)) throw new Error('Browser-Tab nicht gefunden');
    await this.releaseButtons();
    this.activeTabId = tabId;
    const page = this.pages.get(tabId);
    // Viewport nachziehen (Tab kann vor einem resize erstellt worden sein)
    await page.setViewport({
      width: this.viewport.width,
      height: this.viewport.height,
      deviceScaleFactor: this.viewport.dpr,
    }).catch(() => undefined);
    await page.bringToFront().catch(() => undefined);
    await this.startScreencast(page);
    await this.broadcastState();
    return this.state();
  }

  async closeTab(tabId) {
    const page = this.pages.get(tabId);
    if (!page) return this.state();
    await this.releaseButtons();
    await page.close();
    // Der page-'close'-Handler startet den Screencast auf dem Folgetab neu —
    // kein expliziter Restart hier (würde einen doppelten Restart auslösen).
    return this.state();
  }

  async resize(width, height, dpr) {
    const nextWidth = clamp(Math.round(width || this.viewport.width), 480, 1920);
    const nextHeight = clamp(Math.round(height || this.viewport.height), 360, 1200);
    const nextDpr = clamp(dpr || this.viewport.dpr, 1, 2);
    const next = {
      width: nextWidth - (nextWidth % 2),
      height: nextHeight - (nextHeight % 2),
      dpr: nextDpr,
    };
    if (next.width === this.viewport.width && next.height === this.viewport.height && next.dpr === this.viewport.dpr) return;
    this.viewport = next;
    // Altes Frame verwerfen: sonst replayt der Keepalive bis zum ersten neuen
    // Frame weiterhin in alter Auflösung.
    this.lastFrame = null;
    this.lastRealFrameAt = Date.now();
    const page = this.getActivePage();
    if (!page) return;
    await page.setViewport({ width: next.width, height: next.height, deviceScaleFactor: next.dpr }).catch(() => undefined);
    // Screencast mit neuen maxWidth/maxHeight neu starten → liefert frisches
    // Frame in der neuen Auflösung.
    await this.startScreencast(page, { force: true });
  }

  /* ─── Input-Pipeline ───
   * Moves: queueMove — sofort entgegennehmen, gebündelt alle 16ms an Chromium
   * (last-write-wins, KEIN Stale-Drop, KEIN Throttle im Client). Die sichtbare
   * Trajektorie ist damit die echte User-Bewegung.
   * Alle anderen Ops: serielle inputQueue (nur schnelle Ops — max. wenige ms),
   * damit down/up-Reihenfolge garantiert ist.
   * Navigation/Resize: asynchron NEBEN der Queue — ein 30s-goto blockiert
   * keine Eingaben mehr.
   */
  queueMove(peer, message) {
    this.lastUsed = Date.now();
    this.lastInputAt = Date.now();
    if (peer !== this.controlPeer) {
      this.controlPeer = peer;
      void this.broadcastState();
    }
    peer.moveSlot = {
      x: clamp(message.x, 0, this.viewport.width),
      y: clamp(message.y, 0, this.viewport.height),
    };
    if (peer.moveTimer) return;
    peer.moveTimer = setTimeout(() => {
      peer.moveTimer = null;
      const slot = peer.moveSlot;
      peer.moveSlot = null;
      if (!slot) return;
      const page = this.getActivePage();
      if (!page) return;
      this.moveChain = this.moveChain
        .then(() => page.mouse.move(slot.x, slot.y))
        .catch(() => undefined);
    }, MOVE_FLUSH_MS);
  }

  // Vor down/up/click/wheel: noch nicht geflushede Move-Position geordnet
  // übergeben (sonst klickt man auf die alte Cursor-Position).
  async flushPendingMove(peer, page) {
    if (!peer) return;
    if (peer.moveTimer) { clearTimeout(peer.moveTimer); peer.moveTimer = null; }
    const slot = peer.moveSlot;
    peer.moveSlot = null;
    if (!slot) return;
    this.moveChain = this.moveChain.then(() => page.mouse.move(slot.x, slot.y)).catch(() => undefined);
    await this.moveChain;
  }

  routeInput(peer, message) {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'mouse' && message.action === 'move') return this.queueMove(peer, message);
    // Navigation/Tab-Ops/Resize: asynchron, blockieren keine Eingaben
    if (['navigate', 'reload', 'back', 'forward', 'new-tab', 'close-tab', 'activate-tab', 'resize'].includes(message.type)) {
      void this.input(peer, message).catch((error) => console.error('Nav-Input failed:', error.message));
      return;
    }
    // Control/Release: sofort, nie in der Queue warten
    if (message.type === 'take-control' || message.type === 'release-control' || message.type === 'release') {
      void this.input(peer, message).catch((error) => console.error('Control-Input failed:', error.message));
      return;
    }
    // Schnelle Ops seriell: down/up-Reihenfolge und Klick-Sequenz bleiben intakt
    peer.inputQueue = peer.inputQueue
      .then(() => this.input(peer, message))
      .catch((error) => console.error('Input failed:', error.message));
  }

  async input(peer, message) {
    this.lastUsed = Date.now();
    if (['mouse', 'wheel', 'keyboard'].includes(message.type)) this.lastInputAt = Date.now();
    if (message.type === 'take-control') {
      this.controlPeer = peer;
      void this.broadcastState();
      return;
    }
    if (message.type === 'release-control') {
      if (this.controlPeer === peer) this.controlPeer = this.peers.values().next().value || null;
      void this.broadcastState();
      return;
    }
    if (message.type === 'release') return this.releaseButtons();
    // Auto-Take-Control: Jede Interaktion eines Nicht-Control-Peers übernimmt
    // die Kontrolle. Verhindert den "erster Peer blockiert alle Klicks"-Zustand.
    if (peer !== this.controlPeer) {
      this.controlPeer = peer;
      void this.broadcastState();
    }

    if (message.type === 'navigate') return this.navigate(message.url);
    if (message.type === 'new-tab') return this.newTab(message.url || DEFAULT_START_URL);
    if (message.type === 'activate-tab') return this.activate(message.tabId);
    if (message.type === 'close-tab') return this.closeTab(message.tabId);
    if (message.type === 'resize') return this.resize(message.width, message.height, message.dpr);
    if (message.type === 'reload') { await this.releaseButtons(); await this.getActivePage()?.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 }); return this.broadcastState(); }
    if (message.type === 'back') { await this.releaseButtons(); await this.getActivePage()?.goBack({ waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => undefined); return this.broadcastState(); }
    if (message.type === 'forward') { await this.releaseButtons(); await this.getActivePage()?.goForward({ waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => undefined); return this.broadcastState(); }

    const page = this.getActivePage();
    if (!page) return undefined;

    if (message.type === 'mouse') {
      const x = clamp(message.x, 0, this.viewport.width);
      const y = clamp(message.y, 0, this.viewport.height);
      // 'move' kommt nie hier an (queueMove via routeInput); kein direkter
      // Bypass, damit alle Moves über den 16ms-Pacer laufen.
      if (message.action === 'down') {
        await this.flushPendingMove(peer, page);
        await page.mouse.down({ button: message.button || 'left' });
      }
      if (message.action === 'up') {
        await this.flushPendingMove(peer, page);
        await page.mouse.move(x, y);
        await page.mouse.up({ button: message.button || 'left' });
      }
      if (message.action === 'click') {
        // Legacy: vollsynthetischer Klick (Frontend nutzt down/up). Zuerst den
        // evtl. noch gepufferten Move übergeben, sonst landet er NACH dem Klick.
        await this.flushPendingMove(peer, page);
        await humanMouseMove(page, x, y);
        await page.mouse.down({ button: message.button || 'left' });
        await sleep(40 + Math.random() * 120);
        await page.mouse.up({ button: message.button || 'left' });
      }
    }
    if (message.type === 'wheel') {
      await this.flushPendingMove(peer, page);
      await page.mouse.wheel({ deltaX: Number(message.deltaX) || 0, deltaY: Number(message.deltaY) || 0 });
    }
    if (message.type === 'keyboard') {
      if (message.action === 'type') await page.keyboard.type(String(message.text || ''));
      if (message.action === 'press') await page.keyboard.press(String(message.key));
      if (message.action === 'down') await page.keyboard.down(String(message.key));
      if (message.action === 'up') await page.keyboard.up(String(message.key));
    }
  }

  // Garantiertes Loslassen aller Maustasten — deckt pointercancel,
  // lostpointercapture, Disconnect und Tabwechsel ab. mouse.up ohne
  // gedrückte Taste ist im CDP ein No-Op, also immer gefahrlos.
  async releaseButtons() {
    const page = this.getActivePage();
    if (!page) return;
    for (const button of ['left', 'right', 'middle']) {
      await page.mouse.up({ button }).catch(() => undefined);
    }
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
    const peer = { ws, pc, source, audioSource: null, audioProcess: null, audioBuffer: Buffer.alloc(0), timer: null, channel: null, inputQueue: Promise.resolve(), moveSlot: null, moveTimer: null };
    this.peers.add(peer);
    if (!this.controlPeer) this.controlPeer = peer;
    pc.addTrack(source.createTrack());
    if (AUDIO_ENABLED) {
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
    }
    pc.onicecandidate = ({ candidate }) => { if (candidate && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'candidate', candidate })); };
    pc.ondatachannel = ({ channel }) => {
      peer.channel = channel;
      channel.onmessage = (event) => {
        try {
          this.routeInput(peer, JSON.parse(String(event.data)));
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
    // Keepalive-Replay: Liefert der Screencast keine neuen Frames (statische
    // Seite), dasselbe Frame erneut pushen — hält video.currentTime am Laufen
    // (Client-Watchdog), ohne Screenshot/Encode-Kosten.
    peer.timer = setInterval(() => {
      if (this.lastFrame && Date.now() - this.lastRealFrameAt > 400) {
        try { peer.source.onFrame(this.lastFrame); } catch { /* ignore */ }
      }
    }, 500);
    this.ensureStallWatchdog();
    ws.on('message', (raw) => {
      try {
        if (LOG_DEBUG) console.error('WS-MSG:', String(raw).slice(0, 120));
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
      this.routeInput(peer, message.payload);
    }
  }

  removePeer(peer) {
    if (!this.peers.delete(peer)) return;
    // Noch in der Queue stehende Inputs abarbeiten, aber die Taste sicher loslassen
    peer.inputQueue = peer.inputQueue
      .then(() => this.releaseButtons())
      .catch(() => undefined);
    if (this.controlPeer === peer) this.controlPeer = this.peers.values().next().value || null;
    if (peer.timer) clearInterval(peer.timer);
    if (peer.moveTimer) clearTimeout(peer.moveTimer);
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
    await this.stopScreencast();
    for (const peer of this.peers) this.removePeer(peer);
    this.controlPeer = null;
    if (this.browser) await this.browser.close().catch(() => undefined);
    this.browser = null;
    this.pages.clear();
    this.activeTabId = null;
    this.lastFrame = null;
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

// Stream-Token via Sec-WebSocket-Protocol ("bearer-<token>") — landet nicht in
// Access-Logs/URLs. Legacy-Query-Parameter bleibt als Fallback erhalten.
function extractStreamToken(req, requestUrl) {
  const protocols = String(req.headers['sec-websocket-protocol'] || '')
    .split(',')
    .map((entry) => entry.trim());
  const bearer = protocols.find((entry) => entry.startsWith('bearer-'));
  if (bearer) return bearer.slice('bearer-'.length);
  return requestUrl.searchParams.get('token');
}

function originAllowed(req) {
  if (ALLOWED_ORIGINS.length === 0) return true; // nicht konfiguriert
  const origin = req.headers.origin;
  if (!origin) return true; // Non-Browser-Client
  return ALLOWED_ORIGINS.includes(origin);
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
  const token = match ? extractStreamToken(req, requestUrl) : null;
  let sessionId;
  try { sessionId = match ? assertSessionId(match[1]) : null; } catch { sessionId = null; }
  const valid = sessionId && RENDERER_KEY && verifyRendererToken(sessionId, token, RENDERER_KEY);
  if (!valid || !originAllowed(req)) {
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
server.listen(PORT, '0.0.0.0', () => console.log(`Browser renderer listening on http://0.0.0.0:${PORT} (screencast, maxFps=${MAX_FPS}, dpr=${DEFAULT_DPR}, headful=${HEADFUL})`));
