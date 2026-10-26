import { OCRResult, OCRLine } from '../types';

export class OCRService {
  private static instance: OCRService;
  private lastDetectedText = '';
  private stableCount = 0;
  private requiredStableFrames = 2; // Debounce for typewriter dialogues

  private constructor() {}

  public static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  /**
   * Evaluates text stability between consecutive capture frames.
   * Prevents translation spam while dialogue text is typing out.
   */
  public processRawText(rawText: string, lines: OCRLine[] = []): OCRResult {
    const normalized = this.cleanOCRText(rawText);
    const isSameAsLast = this.isTextSimilar(normalized, this.lastDetectedText);

    let changed = false;

    if (!normalized) {
      // Dialogue has disappeared or screen region is blank
      const hadPrevious = !!this.lastDetectedText;
      this.lastDetectedText = '';
      this.stableCount = 0;
      return {
        fullText: '',
        lines: [],
        confidence: 0,
        timestamp: Date.now(),
        changed: hadPrevious,
      };
    }

    if (isSameAsLast) {
      this.stableCount++;
      // If reached exact stable threshold, mark as new actionable dialogue
      if (this.stableCount === this.requiredStableFrames) {
        changed = true;
      }
    } else {
      // New text detected, reset counter
      this.lastDetectedText = normalized;
      this.stableCount = 1;
      // If text is short or already stable
      if (this.requiredStableFrames <= 1) {
        changed = true;
      }
    }

    return {
      fullText: normalized,
      lines,
      confidence: 0.95,
      timestamp: Date.now(),
      changed,
    };
  }

  public cleanOCRText(text: string): string {
    return text
      .replace(/\r\n/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public isTextSimilar(a: string, b: string, threshold = 0.85): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return true;
    
    const distance = this.levenshtein(a, b);
    const similarity = 1 - distance / maxLen;
    return similarity >= threshold;
  }

  private levenshtein(a: string, b: string): number {
    const an = a ? a.length : 0;
    const bn = b ? b.length : 0;
    if (an === 0) return bn;
    if (bn === 0) return an;
    
    const matrix = Array.from({ length: bn + 1 }, () => Array(an + 1).fill(0));
    for (let i = 0; i <= an; ++i) matrix[0][i] = i;
    for (let i = 0; i <= bn; ++i) matrix[i][0] = i;

    for (let i = 1; i <= bn; ++i) {
      for (let j = 1; j <= an; ++j) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[bn][an];
  }
}
