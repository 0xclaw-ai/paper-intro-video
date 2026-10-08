// Minimal Chrome DevTools Protocol client — no npm dependencies (Node >= 22: global WebSocket).
// Launches a headless Chromium with its own throwaway profile, so it never touches a
// browser session the user already has open.
import { spawn } from 'node:child_process';
import { mkdtempSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';

/** Locate a headless-capable Chromium: CHROME_PATH, then Playwright's download, then an installed Chrome / Chromium / Edge. */
export function findBrowser({ needPdfViewer = false } = {}) {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [];
  const home = homedir(), env = process.env;
  // Playwright keeps its browsers in the user's cache folder, which differs per system
  for (const pw of [env.PLAYWRIGHT_BROWSERS_PATH, env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'ms-playwright'), join(home, 'AppData', 'Local', 'ms-playwright'),
    join(home, '.cache', 'ms-playwright'), join(home, 'Library', 'Caches', 'ms-playwright')]) {
    if (!pw || !existsSync(pw)) continue;
    const dirs = readdirSync(pw).sort().reverse();
    if (!needPdfViewer) {
      for (const d of dirs.filter((x) => x.startsWith('chromium_headless_shell-'))) {
        for (const sub of readdirSync(join(pw, d))) candidates.push(join(pw, d, sub, 'chrome-headless-shell.exe'), join(pw, d, sub, 'chrome-headless-shell'));
      }
    }
    for (const d of dirs.filter((x) => /^chromium-\d+$/.test(x))) {
      for (const sub of readdirSync(join(pw, d))) {
        candidates.push(join(pw, d, sub, 'chrome.exe'), join(pw, d, sub, 'chrome'), join(pw, d, sub, 'Chromium.app', 'Contents', 'MacOS', 'Chromium'));
      }
    }
  }
  // an installed browser: the usual program folders on Windows, the application folders on macOS, the PATH elsewhere
  for (const base of [env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA]) {
    if (base) candidates.push(join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'), join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
  }
  for (const apps of ['/Applications', join(home, 'Applications')]) {
    candidates.push(join(apps, 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'), join(apps, 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      join(apps, 'Microsoft Edge.app', 'Contents', 'MacOS', 'Microsoft Edge'));
  }
  for (const dir of (env.PATH || '').split(process.platform === 'win32' ? ';' : ':')) {
    if (dir) for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) candidates.push(join(dir, name));
  }
  const hit = candidates.find((p) => existsSync(p));
  if (!hit) throw new Error('No Chromium found. Install Chrome, Chromium or Edge (or `npx playwright install chromium`), or set CHROME_PATH to the executable.');
  return hit;
}

export async function launch({ width = 1920, height = 1080, extraArgs = [], needPdfViewer = false } = {}) {
  const exe = findBrowser({ needPdfViewer });
  const profile = mkdtempSync(join(tmpdir(), 'intro-video-'));
  const args = [
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--mute-audio',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--autoplay-policy=no-user-gesture-required',
    '--force-color-profile=srgb',
    `--window-size=${width},${height}`,
    ...extraArgs,
  ];
  if (!/headless-shell/.test(exe)) args.unshift('--headless=new');
  args.push('about:blank');
  const proc = spawn(exe, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error('Timed out waiting for DevTools endpoint\n' + buf)), 30000);
    proc.stderr.on('data', (chunk) => {
      buf += chunk.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
    proc.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Browser exited early (${code})\n${buf}`)); });
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('WebSocket failed')); });

  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, method } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${method}: ${msg.error.message}`)); else resolve(msg.result);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg);
    }
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject, method });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  async function newPage(url = 'about:blank', { dpr = 1 } = {}) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (method, params) => send(method, params, sessionId);
    const consoleLog = [];
    const onEvent = (msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Runtime.consoleAPICalled') {
        consoleLog.push(`[${msg.params.type}] ` + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        consoleLog.push(`[exception] ${d.exception?.description || d.text} @${d.url || ''}:${d.lineNumber}`);
      } else if (msg.method === 'Log.entryAdded') {
        consoleLog.push(`[log:${msg.params.entry.level}] ${msg.params.entry.text} ${msg.params.entry.url || ''}`);
      }
    };
    listeners.add(onEvent);
    await s('Page.enable');
    await s('Runtime.enable');
    await s('Log.enable');
    await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
    const page = {
      sessionId, targetId, consoleLog, send: s,
      async goto(u, { timeout = 60000 } = {}) {
        const loaded = new Promise((resolve, reject) => {
          const timer = setTimeout(() => { listeners.delete(fn); reject(new Error('load timeout: ' + u)); }, timeout);
          const fn = (msg) => {
            if (msg.sessionId === sessionId && msg.method === 'Page.loadEventFired') { clearTimeout(timer); listeners.delete(fn); resolve(); }
          };
          listeners.add(fn);
        });
        await s('Page.navigate', { url: u });
        await loaded;
      },
      async eval(expression, { awaitPromise = true } = {}) {
        const r = await s('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture: true });
        if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
        return r.result.value;
      },
      /** Returns a Buffer. format: 'png' | 'jpeg' | 'webp' */
      async screenshot({ format = 'png', quality, clip } = {}) {
        const r = await s('Page.captureScreenshot', {
          format, ...(quality ? { quality } : {}), ...(clip ? { clip: { ...clip, scale: 1 } } : {}),
          captureBeyondViewport: false, optimizeForSpeed: format === 'png',
        });
        return Buffer.from(r.data, 'base64');
      },
      async close() { listeners.delete(onEvent); await send('Target.closeTarget', { targetId }).catch(() => {}); },
    };
    if (url !== 'about:blank') await page.goto(url);
    return page;
  }

  async function close() {
    try { await send('Browser.close'); } catch { /* already gone */ }
    try { ws.close(); } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 300));
    if (proc.exitCode === null) proc.kill();
  }

  return { exe, newPage, close, send };
}
