import http from 'http';
import { spawn, exec, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PORT = 5174;
const FRONTEND_PORT = 5173;

// Application State
const state = {
  isCapturing: false,
  gameDetected: false,
  gameProcessId: null,
  gameWindowTitle: null,
  activeRegion: { x: 384, y: 820, width: 1152, height: 216 },
  pollingSpeedMs: 500,
  engineType: 'hybrid', // online | hybrid | offline (disabled)
  onlineProvider: 'google',
  latestOCR: { fullText: '', lines: [], warmOcrLatencyMs: 0 },
  latestTranslation: { originalText: '', translatedText: '', latencyMs: 0, engineUsed: 'online', timestamp: 0 },
  lastDetectedText: '',
  stats: { ocrAvgMs: 25, transAvgMs: 70, totalFramesProcessed: 0, cacheHits: 0 }
};

// 1. Start Persistent Pre-Warmed OCR Worker
const workerScript = path.join(__dirname, 'persistent_ocr_worker.ps1');
console.log('[GameLingo] Starting Persistent Pre-Warmed Windows OCR Worker...');
const ocrWorker = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', workerScript], {
  stdio: ['pipe', 'pipe', 'inherit']
});

const ocrReader = readline.createInterface({ input: ocrWorker.stdout });
let ocrPendingResolve = null;

ocrReader.on('line', (line) => {
  try {
    const data = JSON.parse(line);
    if (data.status === 'READY') {
      console.log('[GameLingo OCR Worker] ' + data.engine + ' is READY.');
      return;
    }
    if (ocrPendingResolve) {
      ocrPendingResolve(data);
      ocrPendingResolve = null;
    }
  } catch (err) {
    if (ocrPendingResolve) {
      ocrPendingResolve({ success: false, error: 'Malformed OCR response: ' + line });
      ocrPendingResolve = null;
    }
  }
});

function runWarmOCR(imagePath) {
  return new Promise((resolve) => {
    ocrPendingResolve = resolve;
    const req = JSON.stringify({ imagePath: path.resolve(imagePath) }) + '\n';
    ocrWorker.stdin.write(req);
    // Timeout safeguard
    setTimeout(() => {
      if (ocrPendingResolve === resolve) {
        ocrPendingResolve({ success: false, error: 'OCR worker request timeout' });
        ocrPendingResolve = null;
      }
    }, 4000);
  });
}

// 2. Start Standalone Desktop Overlay (WPF Transparent Window)
const overlayScript = path.join(__dirname, 'desktop_overlay.ps1');
const overlayCmdFile = path.join(__dirname, 'overlay_command.json');
fs.writeFileSync(overlayCmdFile, JSON.stringify({ text: '', meta: 'GameLingo Ready' }), 'utf-8');

console.log('[GameLingo] Initializing Standalone Transparent Click-Through Overlay...');
const overlayProcess = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', overlayScript], {
  detached: true,
  stdio: 'ignore'
});

function updateOverlay(text, meta) {
  try {
    fs.writeFileSync(overlayCmdFile, JSON.stringify({ text, meta, timestamp: Date.now() }), 'utf-8');
  } catch {}
}

// 3. Wuthering Waves Window Detector
function probeGameWindow() {
  try {
    const ps = `Get-Process | Where-Object { $_.MainWindowTitle -match 'Wuthering|Waves|Client-Win64' -or $_.ProcessName -match 'Client-Win64' } | Select-Object -First 1 Id, ProcessName, MainWindowTitle, MainWindowHandle | ConvertTo-Json -Compress`;
    const out = execSync(`powershell -NoProfile -Command "${ps}"`, { timeout: 3000 }).toString().trim();
    if (out && out !== 'null') {
      const data = JSON.parse(out);
      state.gameDetected = true;
      state.gameProcessId = data.Id;
      state.gameWindowTitle = data.MainWindowTitle || data.ProcessName;
      return true;
    }
  } catch {}
  state.gameDetected = false;
  state.gameProcessId = null;
  state.gameWindowTitle = null;
  return false;
}

// 4. Terminology Glossary (22 Protected Wuthering Waves Terms)
const GLOSSARY = [
  { source: 'Rover', target: 'Rover' },
  { source: 'Resonator', target: 'Resonator' },
  { source: 'Tacet Discord', target: 'Tacet Discord' },
  { source: 'Echo', target: 'Echo' },
  { source: 'Sonoro Sphere', target: 'Sonoro Sphere' },
  { source: 'Retroact Rain', target: 'Hujan Retroact' },
  { source: 'Jinzhou', target: 'Jinzhou' },
  { source: 'Huanglong', target: 'Huanglong' },
  { source: 'Forte', target: 'Forte' },
  { source: 'Astrite', target: 'Astrite' },
  { source: 'Waveplate', target: 'Waveplate' },
  { source: 'Lustrous Tide', target: 'Lustrous Tide' },
  { source: 'Radiant Tide', target: 'Radiant Tide' },
  { source: 'Forging Tide', target: 'Forging Tide' },
  { source: 'Black Shores', target: 'Black Shores' },
  { source: 'Midnight Rangers', target: 'Midnight Rangers' },
  { source: 'Spectro', target: 'Spectro' },
  { source: 'Havoc', target: 'Havoc' },
  { source: 'Aero', target: 'Aero' },
  { source: 'Glacio', target: 'Glacio' },
  { source: 'Electro', target: 'Electro' },
  { source: 'Fusion', target: 'Fusion' },
];

function applyGlossaryPre(text) {
  let masked = text;
  const tokens = new Map();
  GLOSSARY.forEach((g, idx) => {
    const re = new RegExp(`\\b${g.source}\\b`, 'gi');
    if (re.test(masked)) {
      const ph = `__WW_TERM_${idx}__`;
      tokens.set(ph, g.target);
      masked = masked.replace(re, ph);
    }
  });
  return { masked, tokens };
}

function applyGlossaryPost(translated, tokens) {
  let res = translated;
  for (const [ph, target] of tokens.entries()) {
    res = res.replace(new RegExp(ph, 'g'), target);
  }
  return res;
}

// In-Memory Translation Cache
const translationCache = new Map();

async function translateText(text) {
  const clean = text.trim();
  if (!clean) return '';

  const cacheKey = clean.toLowerCase();
  if (translationCache.has(cacheKey)) {
    state.stats.cacheHits++;
    return translationCache.get(cacheKey);
  }

  const { masked, tokens } = applyGlossaryPre(clean);
  const sw = performance.now();

  const encoded = encodeURIComponent(masked);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=id&dt=t&q=${encoded}`;

  const res = await fetch(url);
  const data = await res.json();
  let rawTrans = '';
  if (Array.isArray(data) && Array.isArray(data[0])) {
    for (const seg of data[0]) {
      if (seg && seg[0]) rawTrans += seg[0];
    }
  }

  const finalTrans = applyGlossaryPost(rawTrans || clean, tokens);
  const latency = Math.round(performance.now() - sw);
  state.stats.transAvgMs = Math.round((state.stats.transAvgMs + latency) / 2);

  translationCache.set(cacheKey, finalTrans);
  return finalTrans;
}

// 5. Live Capture Tick Pipeline
let captureTimer = null;

async function runCaptureTick() {
  if (!state.isCapturing) return;

  try {
    state.stats.totalFramesProcessed++;
    const framePath = path.join(__dirname, 'current_frame.png');
    const { x, y, width, height } = state.activeRegion;

    // Capture Screen Region
    const capScript = path.join(__dirname, 'capture_region.ps1');
    execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${capScript}" -X ${x} -Y ${y} -Width ${width} -Height ${height} -OutputPath "${framePath}"`, { timeout: 2000 });

    if (fs.existsSync(framePath)) {
      // Run Warm OCR
      const ocrResult = await runWarmOCR(framePath);

      if (ocrResult && ocrResult.success) {
        state.latestOCR = ocrResult;
        state.stats.ocrAvgMs = ocrResult.warmOcrLatencyMs || 20;
        const text = (ocrResult.fullText || '').trim();

        if (text && text !== state.lastDetectedText) {
          state.lastDetectedText = text;
          const sw = performance.now();
          const translated = await translateText(text);
          const transLatency = Math.round(performance.now() - sw);

          state.latestTranslation = {
            originalText: text,
            translatedText: translated,
            latencyMs: transLatency,
            engineUsed: 'online',
            timestamp: Date.now()
          };

          // Update real Desktop Overlay
          const totalLat = (ocrResult.warmOcrLatencyMs || 20) + transLatency;
          updateOverlay(translated, `Live Dialogue | OCR: ${ocrResult.warmOcrLatencyMs}ms | Trans: ${transLatency}ms | Total: ${totalLat}ms`);
        } else if (!text && state.lastDetectedText) {
          // Dialogue disappeared from screen
          state.lastDetectedText = '';
          updateOverlay('', 'Dialogue Closed');
        }
      }
    }
  } catch (err) {
    // console.error('[Pipeline Tick Error]', err.message);
  }

  if (state.isCapturing) {
    captureTimer = setTimeout(runCaptureTick, state.pollingSpeedMs);
  }
}

// 6. IPC HTTP Server
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200); res.end(); return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/status') {
    probeGameWindow();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state));
    return;
  }

  if (url.pathname === '/api/start' && req.method === 'POST') {
    state.isCapturing = true;
    if (captureTimer) clearTimeout(captureTimer);
    captureTimer = setTimeout(runCaptureTick, 100);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, isCapturing: true }));
    return;
  }

  if (url.pathname === '/api/pause' && req.method === 'POST') {
    state.isCapturing = false;
    if (captureTimer) { clearTimeout(captureTimer); captureTimer = null; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, isCapturing: false }));
    return;
  }

  if (url.pathname === '/api/stop' && req.method === 'POST') {
    state.isCapturing = false;
    if (captureTimer) { clearTimeout(captureTimer); captureTimer = null; }
    state.lastDetectedText = '';
    updateOverlay('', 'GameLingo Stopped');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, isCapturing: false }));
    return;
  }

  if (url.pathname === '/api/settings' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const update = JSON.parse(body || '{}');
        if (update.activeRegion) state.activeRegion = update.activeRegion;
        if (update.pollingSpeedMs) state.pollingSpeedMs = update.pollingSpeedMs;
        if (update.engineType && update.engineType !== 'offline') state.engineType = update.engineType;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, state }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/test-frame' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { text = "Rover: Something doesn't feel right here." } = JSON.parse(body || '{}');
        const sw = performance.now();
        const translated = await translateText(text);
        const transLatency = Math.round(performance.now() - sw);

        state.latestOCR = { fullText: text, lines: [], warmOcrLatencyMs: 18 };
        state.latestTranslation = {
          originalText: text,
          translatedText: translated,
          latencyMs: transLatency,
          engineUsed: 'online',
          timestamp: Date.now()
        };

        updateOverlay(translated, `Test Frame | Trans: ${transLatency}ms`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ocr: state.latestOCR, translation: state.latestTranslation }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[GameLingo IPC Server] Active on http://127.0.0.1:${PORT}`);

  // Launch Vite Frontend Dev Server
  const viteProcess = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'dev'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  });

  // Launch WebView2 Desktop App Window
  setTimeout(() => {
    const appUrl = `http://localhost:${FRONTEND_PORT}`;
    const edgePaths = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    let edgeExecutable = edgePaths.find(p => fs.existsSync(p));

    if (edgeExecutable) {
      console.log(`[GameLingo Launcher] Spawning Desktop WebView2 App Window from ${edgeExecutable}`);
      spawn(edgeExecutable, [
        `--app=${appUrl}`,
        '--window-size=1280,840',
        '--app-id=GameLingoTranslator',
        '--user-data-dir=D:\\tmp\\gamelingo_profile'
      ], { detached: true, stdio: 'ignore' });
    }
  }, 2500);

  process.on('SIGINT', () => {
    state.isCapturing = false;
    ocrWorker.kill();
    overlayProcess.kill();
    viteProcess.kill();
    server.close();
    process.exit();
  });
});
