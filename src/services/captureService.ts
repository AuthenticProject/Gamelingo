import { CaptureRegion, GameWindowInfo } from '../types';

export class CaptureService {
  private static instance: CaptureService;
  private isCapturing = false;
  private currentWindow: GameWindowInfo | null = null;
  private captureIntervalId: any = null;

  private constructor() {
    // Default simulated / detected Wuthering Waves window
    this.currentWindow = {
      title: 'Wuthering Waves (Client-Win64-Shipping)',
      handle: 0x12040,
      processId: 10452,
      bounds: {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
      },
      dpiScale: 1.0,
      isBorderless: true,
    };
  }

  public static getInstance(): CaptureService {
    if (!CaptureService.instance) {
      CaptureService.instance = new CaptureService();
    }
    return CaptureService.instance;
  }

  public getGameWindow(): GameWindowInfo | null {
    return this.currentWindow;
  }

  public setGameWindow(win: GameWindowInfo): void {
    this.currentWindow = win;
  }

  public calculatePixelBounds(region: CaptureRegion, win: GameWindowInfo) {
    const scale = win.dpiScale || 1.0;
    return {
      x: Math.round(win.bounds.x + region.xRatio * win.bounds.width * scale),
      y: Math.round(win.bounds.y + region.yRatio * win.bounds.height * scale),
      width: Math.round(region.wRatio * win.bounds.width * scale),
      height: Math.round(region.hRatio * win.bounds.height * scale),
    };
  }

  public startCapture(
    intervalMs: number, 
    onFrame: (frameId: number) => Promise<void>
  ): void {
    if (this.isCapturing) return;
    this.isCapturing = true;

    let frameId = 0;
    const loop = async () => {
      if (!this.isCapturing) return;
      try {
        frameId++;
        await onFrame(frameId);
      } catch (err) {
        console.error('Capture pipeline tick error:', err);
      }
      if (this.isCapturing) {
        this.captureIntervalId = setTimeout(loop, intervalMs);
      }
    };

    loop();
  }

  public stopCapture(): void {
    this.isCapturing = false;
    if (this.captureIntervalId) {
      clearTimeout(this.captureIntervalId);
      this.captureIntervalId = null;
    }
  }

  public getStatus(): boolean {
    return this.isCapturing;
  }
}
