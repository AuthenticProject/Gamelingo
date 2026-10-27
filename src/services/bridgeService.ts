import { TextBlock, CandidateWindow } from '../types';

export interface BackendState {
  isCapturing: boolean;
  captureStatus: 'active' | 'paused' | 'standby';
  captureMode: 'full' | 'custom' | 'dialogue';
  displayMode: 'replacement' | 'subtitle';
  performancePreset: 'performance' | 'balanced' | 'responsive';
  pollingSpeedMs: number;
  gameDetected: boolean;
  manualWindowSelected: boolean;
  selectedWindow: CandidateWindow | null;
  allWindows: CandidateWindow[];
  activeRegion: { x: number; y: number; width: number; height: number };
  engineType: string;
  onlineProvider: string;
  detectedBlockCount: number;
  translatedBlockCount: number;
  detectedBlocks: TextBlock[];
  translatedBlocks: TextBlock[];
  latestOCR: {
    fullText: string;
    lines: any[];
    blocks: TextBlock[];
    warmOcrLatencyMs: number;
  };
  latestTranslation: {
    originalText: string;
    translatedText: string;
    blocks: TextBlock[];
    latencyMs: number;
    engineUsed: string;
    timestamp: number;
  };
  stats: {
    ocrAvgMs: number;
    transAvgMs: number;
    totalFramesProcessed: number;
    cacheHits: number;
    cpuUsagePercent: number;
    ramUsageMb: number;
  };
}

const API_BASE = 'http://127.0.0.1:5174/api';

export class BridgeService {
  private static instance: BridgeService;

  private constructor() {}

  public static getInstance(): BridgeService {
    if (!BridgeService.instance) {
      BridgeService.instance = new BridgeService();
    }
    return BridgeService.instance;
  }

  public async getStatus(): Promise<BackendState | null> {
    try {
      const res = await fetch(`${API_BASE}/status`, { signal: AbortSignal.timeout(1500) });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  public async getWindows(): Promise<{ success: boolean; gameDetected: boolean; selectedWindow: CandidateWindow | null; windows: CandidateWindow[] } | null> {
    try {
      const res = await fetch(`${API_BASE}/windows`, { signal: AbortSignal.timeout(2500) });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  public async selectWindow(handle: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/select-window`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async startTranslation(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/start`, { method: 'POST', signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async pauseTranslation(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/pause`, { method: 'POST', signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async stopTranslation(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/stop`, { method: 'POST', signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async updateSettings(settings: Partial<BackendState>): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async triggerTestFrame(text?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/test-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(5000),
      });
      return await res.json();
    } catch {
      return null;
    }
  }

  public getPreviewFrameUrl(): string {
    return `${API_BASE}/preview-frame?t=${Date.now()}`;
  }
}
