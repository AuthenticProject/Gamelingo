import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// 1. Text Normalization Test
function cleanOCRText(text) {
  return text
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTextSimilar(a, b, threshold = 0.85) {
  if (a === b) return true;
  if (!a || !b) return false;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return true;
  
  // Levenshtein
  const an = a.length;
  const bn = b.length;
  const matrix = Array.from({ length: bn + 1 }, () => Array(an + 1).fill(0));
  for (let i = 0; i <= an; ++i) matrix[0][i] = i;
  for (let i = 0; i <= bn; ++i) matrix[i][0] = i;
  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  const distance = matrix[bn][an];
  const similarity = 1 - distance / maxLen;
  return similarity >= threshold;
}

describe('OCR Text Stability & Normalization', () => {
  test('cleanOCRText removes excess whitespace and linebreaks', () => {
    const raw = "Rover,  the   Sonoro Sphere \r\nis \n expanding! ";
    const cleaned = cleanOCRText(raw);
    assert.equal(cleaned, "Rover, the Sonoro Sphere is expanding!");
  });

  test('isTextSimilar recognizes typing animation frames as identical dialogue', () => {
    const full = "Something doesn't feel right here.";
    const partial = "Something doesn't feel right here..";
    assert.equal(isTextSimilar(full, partial, 0.90), true);
  });

  test('isTextSimilar distinguishes different dialogue lines', () => {
    const lineA = "Yangyang: We must head back to Jinzhou.";
    const lineB = "Chixia: Watch out for that Tacet Discord!";
    assert.equal(isTextSimilar(lineA, lineB, 0.80), false);
  });
});

// 2. Glossary Term Masking & Protection Test
describe('Wuthering Waves Glossary System', () => {
  const glossary = [
    { source: 'Rover', target: 'Rover', caseSensitive: true },
    { source: 'Resonator', target: 'Resonator', caseSensitive: true },
    { source: 'Sonoro Sphere', target: 'Sonoro Sphere', caseSensitive: true },
    { source: 'Retroact Rain', target: 'Hujan Retroact', caseSensitive: true },
  ];

  function applyPreMask(text, dict) {
    let masked = text;
    const tokens = new Map();
    let idx = 0;
    for (const entry of dict) {
      const regex = new RegExp(`\\b${entry.source}\\b`, entry.caseSensitive ? 'g' : 'gi');
      if (regex.test(masked)) {
        const ph = `__TERM_${idx}__`;
        tokens.set(ph, entry.target);
        masked = masked.replace(regex, ph);
        idx++;
      }
    }
    return { masked, tokens };
  }

  function applyPostMask(translated, tokens) {
    let res = translated;
    for (const [ph, target] of tokens.entries()) {
      res = res.replace(new RegExp(ph, 'g'), target);
    }
    return res;
  }

  test('Glossary protects fantasy terminology from being translated', () => {
    const input = "Rover stepped into the Sonoro Sphere during the Retroact Rain.";
    const { masked, tokens } = applyPreMask(input, glossary);
    assert.ok(masked.includes('__TERM_0__'));
    assert.ok(masked.includes('__TERM_1__'));
    assert.ok(masked.includes('__TERM_2__'));

    // Simulated translation output
    const translatedMock = "__TERM_0__ melangkah ke dalam __TERM_1__ saat __TERM_2__.";
    const restored = applyPostMask(translatedMock, tokens);

    assert.equal(restored, "Rover melangkah ke dalam Sonoro Sphere saat Hujan Retroact.");
  });
});

// 3. Cache LRU & Bounded Size Test
describe('Translation Cache Service', () => {
  class MockCache {
    constructor(maxSize = 3) {
      this.cache = new Map();
      this.maxSize = maxSize;
    }
    set(key, val) {
      if (this.cache.size >= this.maxSize) {
        const oldest = this.cache.keys().next().value;
        this.cache.delete(oldest);
      }
      this.cache.set(key, { val, hits: 1 });
    }
    get(key) {
      const item = this.cache.get(key);
      if (item) {
        item.hits++;
        this.cache.delete(key);
        this.cache.set(key, item);
        return item.val;
      }
      return null;
    }
  }

  test('Cache evicts oldest items when max limit is exceeded', () => {
    const cache = new MockCache(2);
    cache.set('line1', 'terjemahan 1');
    cache.set('line2', 'terjemahan 2');
    assert.equal(cache.get('line1'), 'terjemahan 1');

    // Adding 3rd item should evict 'line2' because line1 was recently accessed
    cache.set('line3', 'terjemahan 3');
    assert.equal(cache.get('line2'), null);
    assert.equal(cache.get('line1'), 'terjemahan 1');
    assert.equal(cache.get('line3'), 'terjemahan 3');
  });
});

// 4. Region Calculation Test
describe('Capture Region Pixel Calculation', () => {
  function calculatePixelBounds(region, win) {
    const scale = win.dpiScale || 1.0;
    return {
      x: Math.round(win.bounds.x + region.xRatio * win.bounds.width * scale),
      y: Math.round(win.bounds.y + region.yRatio * win.bounds.height * scale),
      width: Math.round(region.wRatio * win.bounds.width * scale),
      height: Math.round(region.hRatio * win.bounds.height * scale),
    };
  }

  test('Calculates exact 1080p pixel bounds for dialogue preset', () => {
    const preset = { xRatio: 0.20, yRatio: 0.76, wRatio: 0.60, hRatio: 0.20 };
    const win = { bounds: { x: 0, y: 0, width: 1920, height: 1080 }, dpiScale: 1.0 };
    const bounds = calculatePixelBounds(preset, win);

    assert.equal(bounds.x, 384);
    assert.equal(bounds.y, 821);
    assert.equal(bounds.width, 1152);
    assert.equal(bounds.height, 216);
  });
});
