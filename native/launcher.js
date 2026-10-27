import http from 'http';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PORT = 5174;
const FRONTEND_PORT = 5173;

// Application State
const state = {
  isCapturing: false,
  captureStatus: 'standby', // 'active' | 'paused' | 'standby'
  captureMode: 'full',      // 'full' (Full Game Translation) | 'custom' (Selected Region) | 'dialogue' (Legacy)
  displayMode: 'replacement', // 'replacement' (Mode A - Visual Replacement) | 'subtitle' (Mode B)
  performancePreset: 'balanced', // 'performance' | 'balanced' | 'responsive'
  pollingSpeedMs: 500,

  // Window targeting & detection
  gameDetected: false,
  manualWindowSelected: false,
  selectedWindow: null,     // { handle, pid, title, processName, clientWidth, clientHeight, clientScreenX, clientScreenY }
  allWindows: [],

  activeRegion: { x: 384, y: 820, width: 1152, height: 216 },
  engineType: 'hybrid',     // online | hybrid | offline
  onlineProvider: 'google',

  detectedBlockCount: 0,
  translatedBlockCount: 0,
  detectedBlocks: [],
  translatedBlocks: [],

  latestOCR: { fullText: '', lines: [], blocks: [], warmOcrLatencyMs: 0 },
  latestTranslation: { originalText: '', translatedText: '', blocks: [], latencyMs: 0, engineUsed: 'online', timestamp: 0 },

  stats: {
    ocrAvgMs: 20,
    transAvgMs: 65,
    totalFramesProcessed: 0,
    cacheHits: 0,
    cpuUsagePercent: 1.4,
    ramUsageMb: 48
  },

  lastFrameHash: null,
  consecutiveStaticFrames: 0
};

// 1. Terminology Glossary (22 Protected Wuthering Waves Terms)
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

async function translateBatch(texts) {
  if (!texts || texts.length === 0) return [];
  const uncachedIndices = [];
  const results = new Array(texts.length).fill('');

  texts.forEach((t, i) => {
    const clean = t.trim();
    if (!clean) {
      results[i] = '';
      return;
    }
    const key = clean.toLowerCase();
    if (translationCache.has(key)) {
      state.stats.cacheHits++;
      results[i] = translationCache.get(key);
    } else {
      uncachedIndices.push(i);
    }
  });

  if (uncachedIndices.length === 0) {
    return results;
  }

  try {
    const sw = performance.now();
    const DELIM = ' ||| ';
    const tokensList = [];
    const maskedList = uncachedIndices.map(idx => {
      const { masked, tokens } = applyGlossaryPre(texts[idx].trim());
      tokensList.push(tokens);
      return masked;
    });

    const combined = maskedList.join(DELIM);
    const encoded = encodeURIComponent(combined);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=id&dt=t&q=${encoded}`;

    const res = await fetch(url);
    const data = await res.json();
    let rawTrans = '';
    if (Array.isArray(data) && Array.isArray(data[0])) {
      for (const seg of data[0]) {
        if (seg && seg[0]) rawTrans += seg[0];
      }
    }

    const segments = rawTrans.split(/\s*\|\|\|\s*/);
    uncachedIndices.forEach((origIdx, k) => {
      const seg = segments[k] || texts[origIdx];
      const finalTrans = applyGlossaryPost(seg, tokensList[k]);
      results[origIdx] = finalTrans;
      translationCache.set(texts[origIdx].trim().toLowerCase(), finalTrans);
    });

    const latency = Math.round(performance.now() - sw);
    state.stats.transAvgMs = Math.round((state.stats.transAvgMs + latency) / 2);
  } catch (err) {
    uncachedIndices.forEach(idx => {
      results[idx] = texts[idx]; // fallback to original
    });
  }

  return results;
}

// 2. Intelligent Multi-Region Line & Block Clustering Algorithm
function clusterLinesIntoBlocks(rawLines, frameWidth = 1920, frameHeight = 1080) {
  if (!rawLines || rawLines.length === 0) return [];

  // 1. Calculate bounding box for each line from its words
  const lines = rawLines.map((l, idx) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    (l.words || []).forEach(w => {
      if (w.box) {
        if (w.box.x < minX) minX = w.box.x;
        if (w.box.y < minY) minY = w.box.y;
        if (w.box.x + w.box.width > maxX) maxX = w.box.x + w.box.width;
        if (w.box.y + w.box.height > maxY) maxY = w.box.y + w.box.height;
      }
    });
    if (minX === Infinity) {
      minX = 0; minY = 0; maxX = 100; maxY = 20;
    }
    return {
      id: `line_${idx}`,
      text: (l.text || '').trim(),
      words: l.words,
      box: {
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.round(maxX - minX),
        height: Math.round(maxY - minY),
      }
    };
  }).filter(l => l.text.length > 0);

  // 2. Sort lines top-to-bottom, then left-to-right
  lines.sort((a, b) => {
    if (Math.abs(a.box.y - b.box.y) > 15) return a.box.y - b.box.y;
    return a.box.x - b.box.x;
  });

  // 3. Cluster into logical blocks
  const blocks = [];
  const assigned = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (assigned.has(i)) continue;
    assigned.add(i);

    const currentBlockLines = [lines[i]];
    let blockBox = { ...lines[i].box };

    let foundNext = true;
    while (foundNext) {
      foundNext = false;
      for (let j = 0; j < lines.length; j++) {
        if (assigned.has(j)) continue;
        const candidate = lines[j];

        // Horizontal void check: do not merge distant columns
        const horizontalVoid = (candidate.box.x > blockBox.x + blockBox.width) 
          ? (candidate.box.x - (blockBox.x + blockBox.width))
          : (blockBox.x > candidate.box.x + candidate.box.width)
            ? (blockBox.x - (candidate.box.x + candidate.box.width))
            : 0;

        if (horizontalVoid > 120) {
          continue;
        }

        // Vertical distance check
        const verticalGap = candidate.box.y - (blockBox.y + blockBox.height);
        const avgHeight = Math.max(14, blockBox.height / currentBlockLines.length);
        const isVerticallyAdjacent = verticalGap >= -8 && verticalGap <= avgHeight * 1.6;

        const horizontalOverlap = Math.max(0,
          Math.min(blockBox.x + blockBox.width, candidate.box.x + candidate.box.width) -
          Math.max(blockBox.x, candidate.box.x)
        );
        const leftIndentDiff = Math.abs(blockBox.x - candidate.box.x);
        const isHorizontallyCompatible = (horizontalOverlap > 10) || (leftIndentDiff < 60);

        // Dialogue speaker ("Rover:") merging with text immediately below it
        const isSpeakerAndDialogue = blockBox.y > frameHeight * 0.7 && verticalGap <= 50 && leftIndentDiff < 100;

        if ((isVerticallyAdjacent && isHorizontallyCompatible) || isSpeakerAndDialogue) {
          assigned.add(j);
          currentBlockLines.push(candidate);
          const newMinX = Math.min(blockBox.x, candidate.box.x);
          const newMinY = Math.min(blockBox.y, candidate.box.y);
          const newMaxX = Math.max(blockBox.x + blockBox.width, candidate.box.x + candidate.box.width);
          const newMaxY = Math.max(blockBox.y + blockBox.height, candidate.box.y + candidate.box.height);
          blockBox = {
            x: newMinX,
            y: newMinY,
            width: newMaxX - newMinX,
            height: newMaxY - newMinY
          };
          foundNext = true;
          break;
        }
      }
    }

    // Determine semantic category
    let category = 'ui_element';
    const textJoined = currentBlockLines.map(l => l.text).join(' ');

    if (blockBox.y > frameHeight * 0.7 && (blockBox.width > frameWidth * 0.25 || textJoined.includes(':'))) {
      category = 'dialogue';
    } else if (blockBox.x < frameWidth * 0.35 && blockBox.y < frameHeight * 0.5) {
      category = 'quest';
    } else if (blockBox.x > frameWidth * 0.65 && blockBox.y < frameHeight * 0.15) {
      category = 'status_currency';
    } else if (blockBox.x > frameWidth * 0.6 && blockBox.y >= frameHeight * 0.15 && blockBox.y < frameHeight * 0.75) {
      category = 'item_tooltip';
    } else if (textJoined.startsWith('[') && textJoined.includes(']')) {
      category = 'interaction_prompt';
    }

    blocks.push({
      id: `block_${blocks.length}`,
      text: textJoined,
      lines: currentBlockLines.map(l => l.text),
      box: blockBox,
      category,
      lineCount: currentBlockLines.length
    });
  }

  return blocks;
}

// 3. Start Persistent Pre-Warmed OCR Worker
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
    setTimeout(() => {
      if (ocrPendingResolve === resolve) {
        ocrPendingResolve({ success: false, error: 'OCR worker request timeout' });
        ocrPendingResolve = null;
      }
    }, 4500);
  });
}

// 4. Start Standalone Desktop Overlay (WPF Transparent Window)
const overlayScript = path.join(__dirname, 'desktop_overlay.ps1');
const overlayCmdFile = path.join(__dirname, 'overlay_command.json');
fs.writeFileSync(overlayCmdFile, JSON.stringify({ mode: 'replacement', blocks: [], text: '', meta: 'GameLingo Ready' }), 'utf-8');

console.log('[GameLingo] Initializing Standalone Transparent Click-Through Overlay...');
const overlayProcess = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', overlayScript], {
  detached: true,
  stdio: 'ignore'
});

function updateOverlay(blocks, text, meta) {
  try {
    fs.writeFileSync(overlayCmdFile, JSON.stringify({
      mode: state.displayMode,
      blocks: blocks || [],
      text: text || '',
      meta: meta || '',
      timestamp: Date.now()
    }), 'utf-8');
  } catch {}
}

// 5. Win32 Window Discovery & Management
function refreshActiveWindows() {
  try {
    const scriptPath = path.join(__dirname, 'get_windows.ps1');
    const out = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, { timeout: 4000 }).toString().trim();
    if (out) {
      let parsed = JSON.parse(out);
      if (!Array.isArray(parsed)) parsed = [parsed];
      state.allWindows = parsed.map(w => ({
        handle: w.Handle,
        pid: w.Pid,
        processName: w.ProcessName,
        title: w.Title,
        className: w.ClassName,
        width: w.Width,
        height: w.Height,
        clientWidth: w.ClientWidth,
        clientHeight: w.ClientHeight,
        clientScreenX: w.ClientScreenX,
        clientScreenY: w.ClientScreenY,
        isGameCandidate: w.IsGameCandidate
      }));

      // Auto-detect Wuthering Waves if not manually locked
      if (!state.manualWindowSelected) {
        const gameWin = state.allWindows.find(w => {
          const lp = (w.processName || '').toLowerCase();
          const lt = (w.title || '').toLowerCase();
          return lp.includes('client-win64') || lp.includes('wuthering') || lt.includes('wuthering waves') || lt.includes('waves');
        });

        if (gameWin) {
          state.gameDetected = true;
          state.selectedWindow = gameWin;
        } else {
          state.gameDetected = false;
          if (!state.selectedWindow && state.allWindows.length > 0) {
            state.selectedWindow = state.allWindows[0];
          }
        }
      }
    }
  } catch (err) {
    // console.error('[Window Probe Error]', err.message);
  }
}

// Run initial window probe
refreshActiveWindows();

// 6. Capture Frame
function captureFrame(outputPath) {
  const resolvedOut = path.resolve(outputPath);
  let hwnd = 0;
  if (state.selectedWindow && state.selectedWindow.handle) {
    hwnd = state.selectedWindow.handle;
  }

  let cropX = 0, cropY = 0, cropW = 0, cropH = 0;
  if (state.captureMode === 'custom' || state.captureMode === 'dialogue') {
    const { x, y, width, height } = state.activeRegion;
    cropX = x; cropY = y; cropW = width; cropH = height;
  }

  const scriptPath = path.join(__dirname, 'do_capture.ps1');
  execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -Hwnd ${hwnd} -OutputPath "${resolvedOut}" -CropX ${cropX} -CropY ${cropY} -CropW ${cropW} -CropH ${cropH}`, { timeout: 3000 });
}

// 7. Live Pipeline Tick
let captureTimer = null;

async function runCaptureTick() {
  if (!state.isCapturing) return;

  try {
    state.stats.totalFramesProcessed++;
    const framePath = path.join(__dirname, 'current_frame.png');

    // 1. Capture target window / full client
    captureFrame(framePath);

    if (fs.existsSync(framePath)) {
      // 2. Fast Frame Difference Detection (Perceptual Hash / Byte Sample)
      const fileBuffer = fs.readFileSync(framePath);
      const hash = crypto.createHash('md5').update(fileBuffer.subarray(0, Math.min(fileBuffer.length, 65536))).digest('hex');

      if (hash === state.lastFrameHash) {
        state.consecutiveStaticFrames++;
        // Frame is identical to previous: sleep adaptive interval
        const adaptiveInterval = state.performancePreset === 'performance' ? 1000 : (state.performancePreset === 'responsive' ? 350 : 600);
        if (state.isCapturing) {
          captureTimer = setTimeout(runCaptureTick, adaptiveInterval);
        }
        return;
      }

      state.lastFrameHash = hash;
      state.consecutiveStaticFrames = 0;

      // 3. Multi-Region Warm OCR
      const ocrResult = await runWarmOCR(framePath);

      if (ocrResult && ocrResult.success) {
        state.stats.ocrAvgMs = ocrResult.warmOcrLatencyMs || 20;

        // 4. Cluster lines into logical blocks
        const frameW = state.selectedWindow?.clientWidth || 1920;
        const frameH = state.selectedWindow?.clientHeight || 1080;
        const blocks = clusterLinesIntoBlocks(ocrResult.lines, frameW, frameH);

        state.detectedBlockCount = blocks.length;
        state.detectedBlocks = blocks;
        state.latestOCR = {
          fullText: ocrResult.fullText || '',
          lines: ocrResult.lines || [],
          blocks,
          warmOcrLatencyMs: ocrResult.warmOcrLatencyMs || 20
        };

        if (blocks.length > 0) {
          // 5. Batch Translate all uncached blocks
          const blockTexts = blocks.map(b => b.text);
          const sw = performance.now();
          const translations = await translateBatch(blockTexts);
          const transLatency = Math.round(performance.now() - sw);

          const translatedBlocks = blocks.map((b, idx) => ({
            ...b,
            translatedText: translations[idx] || b.text
          }));

          state.translatedBlockCount = translatedBlocks.length;
          state.translatedBlocks = translatedBlocks;

          // Find primary dialogue block if any
          const dialogueBlock = translatedBlocks.find(b => b.category === 'dialogue') || translatedBlocks[0];

          state.latestTranslation = {
            originalText: dialogueBlock ? dialogueBlock.text : '',
            translatedText: dialogueBlock ? dialogueBlock.translatedText : '',
            blocks: translatedBlocks,
            latencyMs: transLatency,
            engineUsed: 'online',
            timestamp: Date.now()
          };

          // 6. Update Real Desktop Overlay
          const totalLat = (ocrResult.warmOcrLatencyMs || 20) + transLatency;
          const meta = `GameLingo ${state.captureMode.toUpperCase()} | Blocks: ${translatedBlocks.length} | Latency: ${totalLat}ms`;
          updateOverlay(translatedBlocks, dialogueBlock ? dialogueBlock.translatedText : '', meta);
        } else {
          // No text in frame (game cinematic without subtitles or loading screen)
          state.detectedBlockCount = 0;
          state.translatedBlockCount = 0;
          state.detectedBlocks = [];
          state.translatedBlocks = [];
          updateOverlay([], '', 'Scanning Full Game...');
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

// 8. IPC HTTP Server
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200); res.end(); return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Status endpoint
  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state));
    return;
  }

  // Windows list endpoint
  if (url.pathname === '/api/windows') {
    refreshActiveWindows();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      gameDetected: state.gameDetected,
      selectedWindow: state.selectedWindow,
      windows: state.allWindows
    }));
    return;
  }

  // Select window manual fallback endpoint
  if (url.pathname === '/api/select-window' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { handle } = JSON.parse(body || '{}');
        const match = state.allWindows.find(w => String(w.handle) === String(handle));
        if (match) {
          state.selectedWindow = match;
          state.manualWindowSelected = true;
          state.gameDetected = true; // Manual selection enables capture even if auto-detect didn't match name
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, selectedWindow: match }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Window handle not found' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Start capture
  if (url.pathname === '/api/start' && req.method === 'POST') {
    state.isCapturing = true;
    state.captureStatus = 'active';
    if (captureTimer) clearTimeout(captureTimer);
    captureTimer = setTimeout(runCaptureTick, 100);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, isCapturing: true, captureStatus: state.captureStatus }));
    return;
  }

  // Pause capture
  if (url.pathname === '/api/pause' && req.method === 'POST') {
    state.isCapturing = false;
    state.captureStatus = 'paused';
    if (captureTimer) { clearTimeout(captureTimer); captureTimer = null; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, isCapturing: false, captureStatus: state.captureStatus }));
    return;
  }

  // Stop capture
  if (url.pathname === '/api/stop' && req.method === 'POST') {
    state.isCapturing = false;
    state.captureStatus = 'standby';
    if (captureTimer) { clearTimeout(captureTimer); captureTimer = null; }
    state.detectedBlockCount = 0;
    state.translatedBlockCount = 0;
    state.detectedBlocks = [];
    state.translatedBlocks = [];
    updateOverlay([], '', 'GameLingo Standby');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, isCapturing: false, captureStatus: state.captureStatus }));
    return;
  }

  // Settings update
  if (url.pathname === '/api/settings' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const update = JSON.parse(body || '{}');
        if (update.captureMode) state.captureMode = update.captureMode;
        if (update.displayMode) state.displayMode = update.displayMode;
        if (update.performancePreset) {
          state.performancePreset = update.performancePreset;
          if (update.performancePreset === 'performance') state.pollingSpeedMs = 1000;
          if (update.performancePreset === 'balanced') state.pollingSpeedMs = 500;
          if (update.performancePreset === 'responsive') state.pollingSpeedMs = 250;
        }
        if (update.pollingSpeedMs) state.pollingSpeedMs = update.pollingSpeedMs;
        if (update.activeRegion) state.activeRegion = update.activeRegion;
        if (update.engineType) state.engineType = update.engineType;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, state }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Test Frame endpoint
  if (url.pathname === '/api/test-frame' && req.method === 'POST') {
    try {
      const sampleFramePath = path.join(__dirname, 'sample_game_frame.png');
      const ocrResult = await runWarmOCR(sampleFramePath);

      if (ocrResult && ocrResult.success) {
        const blocks = clusterLinesIntoBlocks(ocrResult.lines, 1920, 1080);
        const blockTexts = blocks.map(b => b.text);
        const sw = performance.now();
        const translations = await translateBatch(blockTexts);
        const transLatency = Math.round(performance.now() - sw);

        const translatedBlocks = blocks.map((b, idx) => ({
          ...b,
          translatedText: translations[idx] || b.text
        }));

        state.detectedBlockCount = translatedBlocks.length;
        state.translatedBlockCount = translatedBlocks.length;
        state.detectedBlocks = translatedBlocks;
        state.translatedBlocks = translatedBlocks;

        const dialogue = translatedBlocks.find(b => b.category === 'dialogue') || translatedBlocks[0];

        state.latestOCR = {
          fullText: ocrResult.fullText || '',
          lines: ocrResult.lines || [],
          blocks: translatedBlocks,
          warmOcrLatencyMs: ocrResult.warmOcrLatencyMs || 20
        };

        state.latestTranslation = {
          originalText: dialogue ? dialogue.text : '',
          translatedText: dialogue ? dialogue.translatedText : '',
          blocks: translatedBlocks,
          latencyMs: transLatency,
          engineUsed: 'online',
          timestamp: Date.now()
        };

        // Also copy sample_game_frame.png to current_frame.png so DiagnosticsPage displays it!
        fs.copyFileSync(sampleFramePath, path.join(__dirname, 'current_frame.png'));

        updateOverlay(translatedBlocks, dialogue ? dialogue.translatedText : '', `Test Full Game Frame | ${translatedBlocks.length} Blocks`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          blocks: translatedBlocks,
          ocr: state.latestOCR,
          translation: state.latestTranslation
        }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: ocrResult?.error || 'OCR failed' }));
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // Frame preview image endpoint for Diagnostics
  if (url.pathname === '/api/preview-frame') {
    const framePath = path.join(__dirname, 'current_frame.png');
    if (fs.existsSync(framePath)) {
      const img = fs.readFileSync(framePath);
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(img);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No frame captured yet' }));
    }
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
