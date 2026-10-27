import { spawn } from 'child_process';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workerScript = path.join(__dirname, 'persistent_ocr_worker.ps1');
const sampleFrame = path.join(__dirname, 'sample_game_frame.png');

function clusterLinesIntoBlocks(rawLines, frameWidth = 1920, frameHeight = 1080) {
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
      text: l.text.trim(),
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

        // Vertical distance check between candidate and block bottom
        const verticalGap = candidate.box.y - (blockBox.y + blockBox.height);
        const avgHeight = Math.max(14, blockBox.height / currentBlockLines.length);

        // Within ~1.5x line height vertically
        const isVerticallyAdjacent = verticalGap >= -8 && verticalGap <= avgHeight * 1.6;

        // Horizontal gap check: if there is a large horizontal void between the boxes, do not merge!
        const boxLeft = Math.min(blockBox.x, candidate.box.x);
        const boxRight = Math.max(blockBox.x + blockBox.width, candidate.box.x + candidate.box.width);
        const horizontalVoid = (candidate.box.x > blockBox.x + blockBox.width) 
          ? (candidate.box.x - (blockBox.x + blockBox.width))
          : (blockBox.x > candidate.box.x + candidate.box.width)
            ? (blockBox.x - (candidate.box.x + candidate.box.width))
            : 0;

        if (horizontalVoid > 120) {
          // Lines are separated by a large horizontal gap (e.g. left column vs right buttons)
          continue;
        }

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
          // Expand block bounding box
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
          break; // re-evaluate with expanded box
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

const ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', workerScript], {
  stdio: ['pipe', 'pipe', 'inherit']
});

const rl = readline.createInterface({ input: ps.stdout });

rl.on('line', (line) => {
  try {
    const data = JSON.parse(line);
    if (data.status === 'READY') {
      ps.stdin.write(JSON.stringify({ imagePath: sampleFrame }) + '\n');
      return;
    }

    const blocks = clusterLinesIntoBlocks(data.lines, 1920, 1080);
    console.log('========================================================================');
    console.log(` CLUSTERED ${blocks.length} INDEPENDENT LOGICAL TEXT BLOCKS FROM FRAME`);
    console.log('========================================================================\n');

    blocks.forEach((b, i) => {
      console.log(`[Block #${i + 1}] Category: ${b.category.toUpperCase()} | Lines: ${b.lineCount}`);
      console.log(`  Box : (x: ${b.box.x}, y: ${b.box.y}, w: ${b.box.width}, h: ${b.box.height})`);
      console.log(`  Text: "${b.text}"\n`);
    });

    ps.stdin.write(JSON.stringify({ command: 'exit' }) + '\n');
  } catch (err) {
    console.error('Error:', err);
  }
});
