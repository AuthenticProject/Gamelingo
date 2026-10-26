import { AppSettings, CaptureRegion } from '../types';

export const WUTHERING_WAVES_PRESETS: CaptureRegion[] = [
  {
    id: 'ww-dialogue-bottom',
    name: 'Main Story & NPC Dialogue (Bottom)',
    xRatio: 0.20,
    yRatio: 0.76,
    wRatio: 0.60,
    hRatio: 0.20,
    description: 'Optimized for character conversations and subtitles in Wuthering Waves.'
  },
  {
    id: 'ww-dialogue-choice',
    name: 'Dialogue Choice Options (Right)',
    xRatio: 0.60,
    yRatio: 0.45,
    wRatio: 0.35,
    hRatio: 0.35,
    description: 'Dialogue choices and interactive decision prompts.'
  },
  {
    id: 'ww-quest-tracker',
    name: 'Quest Objectives (Top Left)',
    xRatio: 0.02,
    yRatio: 0.15,
    wRatio: 0.28,
    hRatio: 0.35,
    description: 'Tracks current mission description, tasks, and world quests.'
  },
  {
    id: 'ww-cutscene-center',
    name: 'Cinematic Subtitles (Bottom Center)',
    xRatio: 0.15,
    yRatio: 0.82,
    wRatio: 0.70,
    hRatio: 0.14,
    description: 'Full-width cinematic subtitles during cutscenes.'
  },
  {
    id: 'ww-echo-tooltip',
    name: 'Echo & Item Tooltips (Center Right)',
    xRatio: 0.40,
    yRatio: 0.20,
    wRatio: 0.55,
    hRatio: 0.60,
    description: 'Echo stats, Sonata effects, and inventory item descriptions.'
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  selectedGame: 'Wuthering Waves',
  targetLanguage: 'id',
  sourceLanguage: 'en',
  translationMode: 'subtitle',
  engineType: 'hybrid',
  onlineProvider: 'google',
  pollingSpeed: 'balanced',
  pollingIntervalMs: 500,
  selectedRegionId: 'ww-dialogue-bottom',
  hotkeys: {
    toggleTranslation: 'Control+Alt+KeyT',
    toggleOverlay: 'Control+Alt+KeyO',
    selectRegion: 'Control+Alt+KeyR',
  },
  overlay: {
    fontSize: 22,
    fontFamily: 'Inter',
    textColor: '#F5F7FA',
    textShadow: true,
    textOutline: true,
    backgroundOpacity: 0.75,
    maxWidthPercent: 80,
    displayDurationMs: 6000,
    clickThrough: true,
    maskColor: '#0B1018',
    maskOpacity: 0.90,
  },
  apiKeys: {},
  hybrid: {
    fallbackToOnline: true,
    requireConsent: false,
  },
  customRegions: {}
};

const STORAGE_KEY = 'gamelingo_settings_v1';

export class ConfigService {
  private static instance: ConfigService;
  private settings: AppSettings;

  private constructor() {
    this.settings = this.loadSettings();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.settings = {
      ...this.settings,
      ...partial,
      overlay: {
        ...this.settings.overlay,
        ...(partial.overlay || {})
      },
      hotkeys: {
        ...this.settings.hotkeys,
        ...(partial.hotkeys || {})
      },
      hybrid: {
        ...this.settings.hybrid,
        ...(partial.hybrid || {})
      }
    };
    this.saveSettings();
    return this.getSettings();
  }

  public resetDefaults(): AppSettings {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
    return this.getSettings();
  }

  private loadSettings(): AppSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return {
          ...DEFAULT_SETTINGS,
          ...JSON.parse(saved)
        };
      }
    } catch {
      // Fallback to defaults
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Storage error safeguard
    }
  }
}
