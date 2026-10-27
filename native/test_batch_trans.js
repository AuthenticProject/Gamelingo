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

async function translateBatch(texts) {
  const sw = performance.now();
  // Batch with delimiter
  const DELIM = ' ||| ';
  const maskedTokensList = [];
  const maskedTexts = texts.map(t => {
    const res = applyGlossaryPre(t);
    maskedTokensList.push(res.tokens);
    return res.masked;
  });

  const combined = maskedTexts.join(DELIM);
  const encoded = encodeURIComponent(combined);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=id&dt=t&q=${encoded}`;

  const resp = await fetch(url);
  const data = await resp.json();
  let rawTrans = '';
  if (Array.isArray(data) && Array.isArray(data[0])) {
    for (const seg of data[0]) {
      if (seg && seg[0]) rawTrans += seg[0];
    }
  }

  const parts = rawTrans.split(/\s*\|\|\|\s*/);
  const finalResults = texts.map((original, i) => {
    const part = parts[i] || original;
    return applyGlossaryPost(part, maskedTokensList[i]);
  });

  const latency = Math.round(performance.now() - sw);
  return { results: finalResults, latency };
}

const sampleBlocks = [
  "Astrite: 1,600",
  "Waveplate: 240 / 240",
  "Main Quest: Echoes of the Past Objective: Investigate the Retroact Rain near Jinzhou Defeat the lurking Tacet Discord (0/3)",
  "Echo: Crownless Cost: 4 | Class: Calamity Class Havoc DMG Bonus: +12.0% crit Rate: +8.5% Skill Effect: Transform into Crownless to unleash a flurry of rapid strikes, dealing massive Havoc DMG to surrounding enemies.",
  "[ Equip to Resonator ]",
  "Rover: The frequency in this area feels completely distorted. We must find Magistrate Jinhsi.",
  "[F] Talk to Yangyang [Space] Jump"
];

console.log('Testing batch translation for 7 detected blocks...');
translateBatch(sampleBlocks).then(({ results, latency }) => {
  console.log(`\nBatch Translation Complete in ${latency} ms!\n`);
  sampleBlocks.forEach((orig, i) => {
    console.log(`[Block #${i + 1}]`);
    console.log(`  EN: ${orig}`);
    console.log(`  ID: ${results[i]}\n`);
  });
}).catch(console.error);
