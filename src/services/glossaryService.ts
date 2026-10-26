import { GlossaryEntry } from '../types';

export const DEFAULT_WUTHERING_WAVES_GLOSSARY: GlossaryEntry[] = [
  { id: 'ww-1', source: 'Rover', target: 'Rover', category: 'character', caseSensitive: true, notes: 'Protagonist' },
  { id: 'ww-2', source: 'Resonator', target: 'Resonator', category: 'lore', caseSensitive: true, notes: 'Playable characters' },
  { id: 'ww-3', source: 'Tacet Discord', target: 'Tacet Discord', category: 'lore', caseSensitive: true, notes: 'Monsters / TD' },
  { id: 'ww-4', source: 'Echo', target: 'Echo', category: 'system', caseSensitive: true, notes: 'Monster soul equipment' },
  { id: 'ww-5', source: 'Jinzhou', target: 'Jinzhou', category: 'location', caseSensitive: true, notes: 'Major city' },
  { id: 'ww-6', source: 'Huanglong', target: 'Huanglong', category: 'location', caseSensitive: true, notes: 'Nation / region' },
  { id: 'ww-7', source: 'Sonoro Sphere', target: 'Sonoro Sphere', category: 'lore', caseSensitive: true, notes: 'Pocket domain' },
  { id: 'ww-8', source: 'Retroact Rain', target: 'Retroact Rain', category: 'lore', caseSensitive: true, notes: 'Phenomenon' },
  { id: 'ww-9', source: 'Forte', target: 'Forte', category: 'system', caseSensitive: true, notes: 'Character ability' },
  { id: 'ww-10', source: 'Astrite', target: 'Astrite', category: 'item', caseSensitive: true, notes: 'Premium gacha currency' },
  { id: 'ww-11', source: 'Lustrous Tide', target: 'Lustrous Tide', category: 'item', caseSensitive: true, notes: 'Standard convene item' },
  { id: 'ww-12', source: 'Radiant Tide', target: 'Radiant Tide', category: 'item', caseSensitive: true, notes: 'Event convene item' },
  { id: 'ww-13', source: 'Forging Tide', target: 'Forging Tide', category: 'item', caseSensitive: true, notes: 'Weapon convene item' },
  { id: 'ww-14', source: 'Waveplate', target: 'Waveplate', category: 'system', caseSensitive: true, notes: 'Stamina energy' },
  { id: 'ww-15', source: 'Midnight Rangers', target: 'Midnight Rangers', category: 'character', caseSensitive: true, notes: 'Military faction' },
  { id: 'ww-16', source: 'Black Shores', target: 'Black Shores', category: 'location', caseSensitive: true, notes: 'Hidden faction / island' },
  { id: 'ww-17', source: 'Spectro', target: 'Spectro', category: 'system', caseSensitive: true, notes: 'Light attribute' },
  { id: 'ww-18', source: 'Havoc', target: 'Havoc', category: 'system', caseSensitive: true, notes: 'Dark attribute' },
  { id: 'ww-19', source: 'Aero', target: 'Aero', category: 'system', caseSensitive: true, notes: 'Wind attribute' },
  { id: 'ww-20', source: 'Glacio', target: 'Glacio', category: 'system', caseSensitive: true, notes: 'Ice attribute' },
  { id: 'ww-21', source: 'Electro', target: 'Electro', category: 'system', caseSensitive: true, notes: 'Electric attribute' },
  { id: 'ww-22', source: 'Fusion', target: 'Fusion', category: 'system', caseSensitive: true, notes: 'Fire attribute' },
];

export class GlossaryService {
  private static instance: GlossaryService;
  private entries: Map<string, GlossaryEntry> = new Map();
  private storageKey = 'gamelingo_glossary_v1';

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): GlossaryService {
    if (!GlossaryService.instance) {
      GlossaryService.instance = new GlossaryService();
    }
    return GlossaryService.instance;
  }

  public getAllEntries(): GlossaryEntry[] {
    return Array.from(this.entries.values());
  }

  public addEntry(entry: Omit<GlossaryEntry, 'id'>): GlossaryEntry {
    const id = 'custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newEntry: GlossaryEntry = { ...entry, id };
    this.entries.set(newEntry.source.toLowerCase(), newEntry);
    this.saveToStorage();
    return newEntry;
  }

  public removeEntry(id: string): void {
    for (const [key, entry] of this.entries.entries()) {
      if (entry.id === id) {
        this.entries.delete(key);
        break;
      }
    }
    this.saveToStorage();
  }

  public applyPreTranslationTokens(text: string): { maskedText: string; tokens: Map<string, string> } {
    let maskedText = text;
    const tokens = new Map<string, string>();
    let tokenIndex = 0;

    for (const entry of this.entries.values()) {
      const escaped = entry.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, entry.caseSensitive ? 'g' : 'gi');
      
      if (regex.test(maskedText)) {
        const placeholder = `__GL_TERM_${tokenIndex}__`;
        tokens.set(placeholder, entry.target);
        maskedText = maskedText.replace(regex, placeholder);
        tokenIndex++;
      }
    }

    return { maskedText, tokens };
  }

  public applyPostTranslationTokens(translatedText: string, tokens: Map<string, string>): string {
    let result = translatedText;
    for (const [placeholder, target] of tokens.entries()) {
      result = result.replace(new RegExp(placeholder, 'g'), target);
    }
    return result;
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const list: GlossaryEntry[] = JSON.parse(raw);
        list.forEach((entry) => this.entries.set(entry.source.toLowerCase(), entry));
        return;
      }
    } catch {
      // Fallback to defaults
    }
    DEFAULT_WUTHERING_WAVES_GLOSSARY.forEach((entry) => {
      this.entries.set(entry.source.toLowerCase(), entry);
    });
  }

  private saveToStorage(): void {
    try {
      const list = Array.from(this.entries.values());
      localStorage.setItem(this.storageKey, JSON.stringify(list));
    } catch {
      // Storage error safeguard
    }
  }
}
