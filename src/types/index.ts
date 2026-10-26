export type TranslationMode = 'subtitle' | 'replacement';

export type TranslationEngineType = 'online' | 'offline' | 'hybrid';

export type OnlineProvider = 'google' | 'deepl' | 'libretranslate' | 'openai';

export type PollingSpeed = 'performance' | 'balanced' | 'responsive';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRWord {
  text: string;
  box: BoundingBox;
}

export interface OCRLine {
  text: string;
  box: BoundingBox;
  words: OCRWord[];
}

export interface OCRResult {
  fullText: string;
  lines: OCRLine[];
  confidence: number;
  timestamp: number;
  changed: boolean;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  engineUsed: TranslationEngineType;
  providerUsed?: OnlineProvider;
  latencyMs: number;
  cached: boolean;
  timestamp: number;
  boxes?: BoundingBox[];
}

export interface CaptureRegion {
  id: string;
  name: string;
  xRatio: number;
  yRatio: number;
  wRatio: number;
  hRatio: number;
  description: string;
}

export interface GameWindowInfo {
  title: string;
  handle: number;
  processId: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  dpiScale: number;
  isBorderless: boolean;
}

export interface GlossaryEntry {
  id: string;
  source: string;
  target: string;
  category: 'character' | 'lore' | 'location' | 'item' | 'system';
  caseSensitive: boolean;
  notes?: string;
}

export interface OfflineModelInfo {
  id: string;
  name: string;
  languagePair: string;
  sizeMb: number;
  downloadUrl: string;
  isInstalled: boolean;
  license: string;
  version: string;
  description: string;
}

export interface AppSettings {
  selectedGame: string;
  targetLanguage: string;
  sourceLanguage: string;
  translationMode: TranslationMode;
  engineType: TranslationEngineType;
  onlineProvider: OnlineProvider;
  pollingSpeed: PollingSpeed;
  pollingIntervalMs: number;
  selectedRegionId: string;
  hotkeys: {
    toggleTranslation: string;
    toggleOverlay: string;
    selectRegion: string;
  };
  overlay: {
    fontSize: number;
    fontFamily: string;
    textColor: string;
    textShadow: boolean;
    textOutline: boolean;
    backgroundOpacity: number;
    maxWidthPercent: number;
    displayDurationMs: number;
    clickThrough: boolean;
    maskColor: string;
    maskOpacity: number;
  };
  apiKeys: {
    deepl?: string;
    openai?: string;
    libretranslateUrl?: string;
  };
  hybrid: {
    fallbackToOnline: boolean;
    requireConsent: boolean;
  };
  customRegions: Record<string, CaptureRegion>;
}
