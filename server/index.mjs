#!/usr/bin/env node
/**
 * Home server for the e-ink panel. Node stdlib only, so it runs on anything
 * that has Node: a Raspberry Pi, a NUC, the Home Assistant box.
 *
 *   /                  the panel page (dist/panel.html), cycling through every view
 *   /views             a list of the views
 *   /views/<id>        one view, fixed
 *   /panel.png         the page as an 800x480 PNG, for devices without a browser;
 *                      ?view=<id> for one view, ?every=<s> to set the cycle
 *   /api/fmi/*         relay to opendata.fmi.fi, cached
 *   /api/porssisahko/* relay to api.porssisahko.net, cached (it has no CORS)
 *   /healthz           upstream status, for a quick check from a phone
 *
 * Everything else under dist/ is served as built, so /dashboard.html and the
 * 3D view work too.
 *
 *   npm run build && npm run serve         PORT=8080 by default
 *
 * The PNG is a headless Chrome/Chromium screenshot. Set CHROME to its path if
 * it is not in one of the usual places. Relays keep the last good response and
 * serve it when upstream is down, so a short outage does not blank the panel.
 */
import { createServer } from 'node:http';
import { readFile, stat, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';
const TZ = process.env.PANEL_TZ ?? 'Europe/Helsinki';
const DIST = resolve(import.meta.dirname, '..', 'dist');

const RELAYS = {
  '/api/fmi/':         { target: 'https://opendata.fmi.fi/', ttl: 5 * 60e3 },
  '/api/porssisahko/': { target: 'https://api.porssisahko.net/', ttl: 15 * 60e3 },
};

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

const log = (...a) => console.log(new Date().toISOString(), ...a);

/* ---------------------------------------------------------------- relays */

const cache = new Map();        // upstream url -> { at, status, type, body }
const health = {};              // relay prefix -> { ok, at, error }

async function relay(prefix, rest, res) {
  const { target, ttl } = RELAYS[prefix];
  const url = target + rest;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttl) return send(res, 200, hit.type, hit.body);
  try {
    const up = await fetch(url, { signal: AbortSignal.timeout(15e3) });
    if (!up.ok) throw new Error(`HTTP ${up.status}`);
    const body = Buffer.from(await up.arrayBuffer());
    const type = up.headers.get('content-type') ?? 'application/octet-stream';
    cache.set(url, { at: Date.now(), type, body });
    // FMI URLs carry a start time, so each minute is a new key; keep it bounded.
    if (cache.size > 50) cache.delete(cache.keys().next().value);
    health[prefix] = { ok: true, at: new Date().toISOString() };
    send(res, 200, type, body);
  } catch (err) {
    health[prefix] = { ok: false, at: new Date().toISOString(), error: err.message };
    log('relay failed', url, err.message);
    // Any earlier answer for this prefix beats nothing. The page decides for
    // itself whether the data inside is too old to show.
    const fallback = hit ?? [...cache].reverse().find(([k]) => k.startsWith(target))?.[1];
    if (fallback) return send(res, 200, fallback.type, fallback.body, { 'x-stale': '1' });
    send(res, 502, 'text/plain', `upstream failed: ${err.message}`);
  }
}

/* ------------------------------------------------------------ screenshot */

const CHROME_CANDIDATES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find((p) => existsSync(p));

const pngs = new Map();         // query -> { at, body }
const rendering = new Map();    // query -> in-flight promise, so parallel requests share one Chrome

/**
 * Headless Chrome writes the screenshot and then, on some builds, never exits.
 * So rather than waiting for exit, poll for the file and stop Chrome once it
 * is there. A fresh profile per shot, or a second Chrome attaches to the first.
 */
async function renderPng(query) {
  if (!CHROME) throw new Error('no Chrome/Chromium found; set CHROME=/path/to/chrome');
  const dir = await mkdtemp(join(tmpdir(), 'panel-'));
  const out = join(dir, 'panel.png');
  const child = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--force-device-scale-factor=1', `--user-data-dir=${join(dir, 'profile')}`,
    '--window-size=800,480', '--virtual-time-budget=15000', `--screenshot=${out}`,
    `http://127.0.0.1:${PORT}/panel.html${query}`,
  ], { env: { ...process.env, TZ }, stdio: 'ignore' });
  try {
    const deadline = Date.now() + 45e3;
    let last = -1;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 300));
      const size = await stat(out).then((s) => s.size, () => 0);
      if (size > 0 && size === last) return await readFile(out);
      last = size;
      if (child.exitCode != null && size === 0) throw new Error(`chrome exited ${child.exitCode}`);
    }
    throw new Error('screenshot timed out');
  } finally {
    child.kill();
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/* Only view and every reach Chrome, so the cache key space stays small. */
function pngQuery(search) {
  const inp = new URLSearchParams(search);
  const out = new URLSearchParams();
  for (const k of ['view', 'every']) if (inp.get(k)) out.set(k, inp.get(k));
  const q = out.toString();
  return q ? `?${q}` : '';
}

async function panelPng(search, res) {
  const query = pngQuery(search);
  // A cycling panel's image changes with the view, so cache it for no longer
  // than one minute; a fixed view only for the clock.
  let hit = pngs.get(query);
  if (!hit || Date.now() - hit.at > 60e3) {
    if (!rendering.has(query)) {
      rendering.set(query, renderPng(query)
        .then((body) => { pngs.set(query, { at: Date.now(), body }); })
        .finally(() => rendering.delete(query)));
    }
    try { await rendering.get(query); } catch (err) {
      log('render failed', query, err.message);
    }
    hit = pngs.get(query);
    if (!hit) return send(res, 503, 'text/plain', 'render failed');
  }
  send(res, 200, 'image/png', hit.body, { 'cache-control': 'no-store' });
}

/* ---------------------------------------------------------------- server */

function send(res, status, type, body, headers = {}) {
  res.writeHead(status, { 'content-type': type, ...headers });
  res.end(body);
}

async function serveStatic(pathname, res) {
  // the panel page answers for / and /views/*; it reads the view from the path
  const rel = pathname === '/' || /^\/views(\/[\w-]*)?$/.test(pathname) ? '/panel.html' : pathname;
  const file = normalize(join(DIST, decodeURIComponent(rel)));
  if (!file.startsWith(DIST)) return send(res, 403, 'text/plain', 'forbidden');
  try {
    const body = await readFile(file);
    send(res, 200, TYPES[extname(file)] ?? 'application/octet-stream', body);
  } catch {
    send(res, 404, 'text/plain', existsSync(DIST) ? 'not found' : 'dist/ missing: run npm run build');
  }
}

createServer(async (req, res) => {
  const { pathname, search } = new URL(req.url, 'http://x');
  try {
    for (const prefix of Object.keys(RELAYS)) {
      if (pathname.startsWith(prefix)) return await relay(prefix, pathname.slice(prefix.length) + search, res);
    }
    if (pathname === '/panel.png') return await panelPng(search, res);
    if (pathname === '/healthz') {
      return send(res, 200, 'application/json',
        JSON.stringify({ chrome: CHROME ?? null, relays: health,
          png: Object.fromEntries([...pngs].map(([q, v]) => [q || '(cycle)', new Date(v.at).toISOString()])) }, null, 2));
    }
    await serveStatic(pathname, res);
  } catch (err) {
    log('error', pathname, err);
    if (!res.headersSent) send(res, 500, 'text/plain', 'internal error');
  }
}).listen(PORT, HOST, () => {
  log(`panel on http://${HOST}:${PORT}/  (png: /panel.png, chrome: ${CHROME ?? 'not found'})`);
});
