import { spawn } from 'child_process';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workerScript = path.join(__dirname, 'persistent_ocr_worker.ps1');
const sampleFrame = path.join(__dirname, 'sample_game_frame.png');

const ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', workerScript], {
  stdio: ['pipe', 'pipe', 'inherit']
});

const rl = readline.createInterface({ input: ps.stdout });

rl.on('line', (line) => {
  try {
    const data = JSON.parse(line);
    if (data.status === 'READY') {
      console.log('Worker is ready. Sending sample_game_frame.png...');
      ps.stdin.write(JSON.stringify({ imagePath: sampleFrame }) + '\n');
      return;
    }

    console.log('\n--- OCR RESULTS ---');
    console.log(`Latency: ${data.warmOcrLatencyMs} ms`);
    console.log(`Total Lines: ${data.lines.length}`);
    data.lines.forEach((l, idx) => {
      console.log(`[Line ${idx + 1}] "${l.text}" (Words: ${l.words.length})`);
    });

    ps.stdin.write(JSON.stringify({ command: 'exit' }) + '\n');
  } catch (err) {
    console.error('Error:', err);
  }
});
