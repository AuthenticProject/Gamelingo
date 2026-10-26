import { spawn } from 'child_process';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workerScript = path.join(__dirname, 'persistent_ocr_worker.ps1');
const testImage = path.join(__dirname, 'test_sample.png');

console.log('======================================================');
console.log(' BENCHMARKING PERSISTENT WARM WINDOWS OCR WORKER');
console.log('======================================================');

const ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', workerScript], {
  stdio: ['pipe', 'pipe', 'inherit']
});

const rl = readline.createInterface({ input: ps.stdout });

let isReady = false;
let requestCount = 0;
const totalRequests = 5;
const latencies = [];
let requestStartTime = 0;

function sendNextRequest() {
  if (requestCount >= totalRequests) {
    ps.stdin.write(JSON.stringify({ command: 'exit' }) + '\n');
    return;
  }
  requestCount++;
  requestStartTime = performance.now();
  const req = { imagePath: testImage };
  ps.stdin.write(JSON.stringify(req) + '\n');
}

rl.on('line', (line) => {
  if (!isReady) {
    try {
      const data = JSON.parse(line);
      if (data.status === 'READY') {
        isReady = true;
        console.log(`[Worker Ready] ${data.engine}`);
        console.log('Sending 5 consecutive OCR requests to measure warm latency...\n');
        sendNextRequest();
      }
    } catch {}
    return;
  }

  const duration = Math.round(performance.now() - requestStartTime);
  latencies.push(duration);

  try {
    const res = JSON.parse(line);
    console.log(`[Request #${requestCount}] Full Text: "${res.fullText}"`);
    console.log(`             Internal WinRT OCR: ${res.warmOcrLatencyMs} ms | Total Roundtrip: ${duration} ms`);
  } catch (e) {
    console.log(`[Request #${requestCount}] Parse error: ${line}`);
  }

  if (requestCount < totalRequests) {
    sendNextRequest();
  } else {
    ps.stdin.write(JSON.stringify({ command: 'exit' }) + '\n');
  }
});

ps.on('close', () => {
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);

  console.log('\n======================================================');
  console.log(' WARM OCR LATENCY SUMMARY');
  console.log('======================================================');
  console.log(` Total Requests Tested : ${totalRequests}`);
  console.log(` Fastest Response      : ${min} ms`);
  console.log(` Slowest Response      : ${max} ms`);
  console.log(` Average Warm Latency  : ${avg} ms`);
  console.log(` Speedup vs Cold Run   : ~${Math.round(1500 / avg)}x faster (from 1500ms down to ${avg}ms!)`);
  console.log('======================================================');
});
