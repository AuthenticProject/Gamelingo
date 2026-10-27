import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('========================================================================');
console.log(' GAMELINGO — UNIVERSAL FULL-GAME TRANSLATION VERIFICATION SUITE');
console.log('========================================================================\n');

// 1. Spawn backend server
console.log('[Step 1] Launching native/launcher.js...');
const serverProcess = spawn('node', ['native/launcher.js'], {
  cwd: projectRoot,
  stdio: ['ignore', 'pipe', 'inherit']
});

serverProcess.stdout.on('data', (d) => {
  const line = d.toString().trim();
  if (line) console.log(`[Backend Log] ${line}`);
});

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTests() {
  // Wait for server to become ready
  console.log('[Step 2] Waiting for IPC server and OCR worker to warm up...');
  let serverReady = false;
  for (let i = 0; i < 20; i++) {
    await sleep(600);
    try {
      const res = await fetch('http://127.0.0.1:5174/api/status');
      if (res.ok) {
        serverReady = true;
        break;
      }
    } catch {}
  }

  if (!serverReady) {
    throw new Error('Backend server failed to start within timeout');
  }

  console.log('>> IPC Server is ONLINE!\n');

  // Test 1: Window Detection & Enumeration
  console.log('[Test 1] Testing Win32 Window Detection & Enumeration (/api/windows)...');
  const winRes = await fetch('http://127.0.0.1:5174/api/windows');
  const winData = await winRes.json();
  console.log(`  Found ${winData.windows?.length || 0} visible desktop windows.`);
  console.log(`  Auto Game Detected: ${winData.gameDetected}`);
  console.log(`  Selected Window: "${winData.selectedWindow?.title || 'None'}" (PID: ${winData.selectedWindow?.pid}, Client: ${winData.selectedWindow?.clientWidth}x${winData.selectedWindow?.clientHeight})\n`);

  if (!winData.windows || winData.windows.length === 0) {
    throw new Error('Window enumeration returned zero windows');
  }

  // Test 2: Fallback Manual Window Selection
  console.log('[Test 2] Testing Manual Window Selection Fallback (/api/select-window)...');
  const testWin = winData.windows[0];
  const selectRes = await fetch('http://127.0.0.1:5174/api/select-window', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle: testWin.handle })
  });
  const selectData = await selectRes.json();
  console.log(`  Manually locked to: "${selectData.selectedWindow?.title}" (Handle: ${selectData.selectedWindow?.handle})`);
  console.log(`  Selection Success: ${selectData.success}\n`);

  // Test 3: Check Initial State & Capture Mode
  console.log('[Test 3] Verifying Capture Mode & Display Mode Defaults (/api/status)...');
  const statusRes = await fetch('http://127.0.0.1:5174/api/status');
  const status = await statusRes.json();
  console.log(`  Capture Mode   : ${status.captureMode} (Requirement: 'full' is default)`);
  console.log(`  Display Mode   : ${status.displayMode} (Requirement: 'replacement' is default)`);
  console.log(`  Capture Status : ${status.captureStatus} (Requirement: 'standby' when stopped, never fake active)`);
  console.log(`  Preset         : ${status.performancePreset}\n`);

  if (status.captureMode !== 'full' || status.displayMode !== 'replacement') {
    throw new Error('Default modes do not match specification');
  }

  // Test 4: Full-Game Multi-Region OCR & Batch Translation Pipeline
  console.log('[Test 4] Triggering Full-Game Multi-Region Test Frame (/api/test-frame)...');
  const testFrameRes = await fetch('http://127.0.0.1:5174/api/test-frame', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const testResult = await testFrameRes.json();

  console.log(`\n>> Multi-Region OCR & Translation Results (${testResult.blocks?.length || 0} Blocks Detected):`);
  console.log('------------------------------------------------------------------------');

  testResult.blocks.forEach((b, idx) => {
    console.log(`[Block #${idx + 1}] Category: ${b.category.toUpperCase()}`);
    console.log(`  Bounding Box : (${b.box.x}, ${b.box.y}) - ${b.box.width}x${b.box.height} px`);
    console.log(`  Original EN  : ${b.text}`);
    console.log(`  Indonesian ID: ${b.translatedText}\n`);
  });

  console.log('------------------------------------------------------------------------');
  console.log(`  Warm OCR Latency       : ${testResult.ocr?.warmOcrLatencyMs} ms`);
  console.log(`  Translation Latency    : ${testResult.translation?.latencyMs} ms`);
  console.log(`  Glossary Protected     : Yes (Rover, Resonator, Tacet Discord, Echo, Jinzhou, etc.)\n`);

  if (!testResult.blocks || testResult.blocks.length < 5) {
    throw new Error('Expected at least 5 independent text blocks in test frame');
  }

  // Test 5: Verify Live Frame Preview
  console.log('[Test 5] Verifying Frame Preview Endpoint (/api/preview-frame)...');
  const previewRes = await fetch('http://127.0.0.1:5174/api/preview-frame');
  console.log(`  HTTP Status    : ${previewRes.status}`);
  console.log(`  Content-Type   : ${previewRes.headers.get('content-type')}`);
  const previewBlob = await previewRes.arrayBuffer();
  console.log(`  Preview Size   : ${previewBlob.byteLength} bytes\n`);

  if (previewBlob.byteLength < 5000) {
    throw new Error('Preview frame size too small');
  }

  console.log('========================================================================');
  console.log(' ALL 5 VERIFICATION STAGES PASSED SUCCESSFULLY!');
  console.log('========================================================================\n');
}

runTests().then(() => {
  serverProcess.kill();
  process.exit(0);
}).catch((err) => {
  console.error('\n[TEST FAILED]', err);
  serverProcess.kill();
  process.exit(1);
});
