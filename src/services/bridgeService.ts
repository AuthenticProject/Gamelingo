export interface BackendState {
  isCapturing: boolean;
  gameDetected: boolean;
  gameProcessId: number | null;
  gameWindowTitle: string | null;
  activeRegion: { x: number; y: number; width: number; height: number };
  pollingSpeedMs: number;
  engineType: string;
  onlineProvider: string;
  latestOCR: { fullText: string; lines: any[]; warmOcrLatencyMs: number };
  latestTranslation: { originalText: string; translatedText: string; latencyMs: number; engineUsed: string; timestamp: number };
  stats: { ocrAvgMs: number; transAvgMs: number; totalFramesProcessed: number; cacheHits: number };
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

  public async triggerTestFrame(text: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/test-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(4000),
      });
      return await res.json();
    } catch {
      return null;
    }
  }
}
