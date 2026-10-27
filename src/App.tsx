import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { SubtitleOverlay } from './components/SubtitleOverlay';
import { TextReplacementOverlay } from './components/TextReplacementOverlay';
import { Dashboard } from './pages/Dashboard';
import { CaptureSettings } from './pages/CaptureSettings';
import { OverlayCustomization } from './pages/OverlayCustomization';
import { TranslationSettings } from './pages/TranslationSettings';
import { GlossaryPage } from './pages/GlossaryPage';
import { OfflineModelManager } from './pages/OfflineModelManager';
import { TranslationHistoryPage } from './pages/TranslationHistory';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { GeneralSettings } from './pages/GeneralSettings';

import { ConfigService, WUTHERING_WAVES_PRESETS } from './services/configService';
import { TranslationCacheService } from './services/cacheService';
import { BridgeService, BackendState } from './services/bridgeService';

import { 
  AppSettings, 
  TranslationResult, 
  OCRResult, 
  GameWindowInfo,
  CandidateWindow
} from './types';

export const App: React.FC = () => {
  const configService = ConfigService.getInstance();
  const cacheService = TranslationCacheService.getInstance();
  const bridge = BridgeService.getInstance();

  const [settings, setSettings] = useState<AppSettings>(configService.getSettings());
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<'active' | 'paused' | 'standby'>('standby');
  const [overlayVisible, setOverlayVisible] = useState(true);

  const [latestTranslation, setLatestTranslation] = useState<TranslationResult | null>(null);
  const [latestOCR, setLatestOCR] = useState<OCRResult | null>(null);
  const [gameWindow, setGameWindow] = useState<GameWindowInfo | null>(null);
  const [candidateWindows, setCandidateWindows] = useState<CandidateWindow[]>([]);
  const [selectedWindow, setSelectedWindow] = useState<CandidateWindow | null>(null);
  const [cacheStats, setCacheStats] = useState(cacheService.getStats());
  const [systemMetrics, setSystemMetrics] = useState({ cpuUsagePercent: 1.4, ramUsageMb: 48, totalFrames: 0 });

  // Initial candidate windows scan
  const refreshWindows = async () => {
    const data = await bridge.getWindows();
    if (data && data.windows) {
      setCandidateWindows(data.windows);
      if (data.selectedWindow) {
        setSelectedWindow(data.selectedWindow);
      }
    }
  };

  useEffect(() => {
    refreshWindows();
  }, []);

  // Live polling of Native Backend Engine
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      const bState: BackendState | null = await bridge.getStatus();
      if (!mounted || !bState) return;

      setIsCapturing(bState.isCapturing);
      setCaptureStatus(bState.captureStatus || (bState.isCapturing ? 'active' : 'standby'));

      if (bState.selectedWindow) {
        setSelectedWindow(bState.selectedWindow);
        setGameWindow({
          title: bState.selectedWindow.title || bState.selectedWindow.processName,
          handle: bState.selectedWindow.handle,
          processId: bState.selectedWindow.pid,
          bounds: { 
            x: bState.selectedWindow.clientScreenX || 0, 
            y: bState.selectedWindow.clientScreenY || 0, 
            width: bState.selectedWindow.clientWidth || 1920, 
            height: bState.selectedWindow.clientHeight || 1080 
          },
          dpiScale: 1.0,
          isBorderless: true,
        });
      } else if (bState.gameDetected) {
        setGameWindow({
          title: 'Wuthering Waves (Active)',
          handle: 0x12040,
          processId: 22800,
          bounds: { x: 0, y: 0, width: 1920, height: 1080 },
          dpiScale: 1.0,
          isBorderless: true,
        });
      } else {
        setGameWindow(null);
      }

      if (bState.latestOCR) {
        setLatestOCR({
          fullText: bState.latestOCR.fullText || '',
          lines: bState.latestOCR.lines || [],
          blocks: bState.latestOCR.blocks || [],
          confidence: 0.98,
          timestamp: Date.now(),
          changed: true,
          warmOcrLatencyMs: bState.latestOCR.warmOcrLatencyMs || 18
        });
      }

      if (bState.latestTranslation && bState.latestTranslation.translatedText) {
        setLatestTranslation({
          originalText: bState.latestTranslation.originalText,
          translatedText: bState.latestTranslation.translatedText,
          blocks: bState.latestTranslation.blocks || [],
          engineUsed: bState.latestTranslation.engineUsed as any || 'online',
          latencyMs: bState.latestTranslation.latencyMs || 60,
          cached: false,
          timestamp: bState.latestTranslation.timestamp || Date.now(),
        });
      }

      if (bState.stats) {
        setSystemMetrics({
          cpuUsagePercent: bState.stats.cpuUsagePercent || 1.4,
          ramUsageMb: bState.stats.ramUsageMb || 48,
          totalFrames: bState.stats.totalFramesProcessed || 0
        });
      }

      setCacheStats(cacheService.getStats());
    }, 600);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [bridge, cacheService]);

  const handleToggleCapture = async () => {
    if (isCapturing) {
      await bridge.pauseTranslation();
      setIsCapturing(false);
      setCaptureStatus('paused');
    } else {
      await bridge.startTranslation();
      setIsCapturing(true);
      setCaptureStatus('active');
    }
  };

  const handleStopCapture = async () => {
    await bridge.stopTranslation();
    setIsCapturing(false);
    setCaptureStatus('standby');
  };

  const handleSelectWindow = async (handle: number) => {
    const ok = await bridge.selectWindow(handle);
    if (ok) {
      const match = candidateWindows.find(w => w.handle === handle);
      if (match) setSelectedWindow(match);
    }
  };

  const handleUpdateSettings = (partial: Partial<AppSettings>) => {
    const updated = configService.updateSettings(partial);
    setSettings(updated);

    const activePreset = WUTHERING_WAVES_PRESETS.find(p => p.id === updated.selectedRegionId) || WUTHERING_WAVES_PRESETS[0];
    const pixelBounds = {
      x: Math.round(activePreset.xRatio * 1920),
      y: Math.round(activePreset.yRatio * 1080),
      width: Math.round(activePreset.wRatio * 1920),
      height: Math.round(activePreset.hRatio * 1080),
    };

    bridge.updateSettings({
      activeRegion: pixelBounds,
      pollingSpeedMs: updated.pollingIntervalMs,
      captureMode: updated.captureMode || 'full',
      displayMode: updated.translationMode || 'replacement',
      performancePreset: updated.pollingSpeed || 'balanced',
    });
  };

  const handleResetDefaults = () => {
    const reset = configService.resetDefaults();
    setSettings(reset);
  };

  const runTestDialogue = async () => {
    await bridge.triggerTestFrame();
  };

  // Global Hotkey Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handleToggleCapture();
      }
      if (e.ctrlKey && e.altKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        setOverlayVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCapturing]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-textMain selection:bg-accent selection:text-background font-sans">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isCapturing={isCapturing}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          isCapturing={isCapturing}
          onToggleCapture={handleToggleCapture}
          onStopCapture={handleStopCapture}
          mode={settings.translationMode}
          onSelectMode={(mode) => handleUpdateSettings({ translationMode: mode })}
          engine={settings.engineType}
          onSelectEngine={(engine) => handleUpdateSettings({ engineType: engine })}
        />

        <main className="flex-1 overflow-hidden relative">
          {currentTab === 'dashboard' && (
            <Dashboard
              isCapturing={isCapturing}
              captureStatus={captureStatus}
              onToggleCapture={handleToggleCapture}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              latestTranslation={latestTranslation}
              latestOCR={latestOCR}
              gameWindow={gameWindow}
              candidateWindows={candidateWindows}
              selectedWindow={selectedWindow}
              onSelectWindow={handleSelectWindow}
              onRefreshWindows={refreshWindows}
              cacheStats={cacheStats}
              systemMetrics={systemMetrics}
              onRunTestTranslation={runTestDialogue}
            />
          )}

          {currentTab === 'capture' && (
            <CaptureSettings
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              gameWindow={gameWindow}
              candidateWindows={candidateWindows}
              selectedWindow={selectedWindow}
              onSelectWindow={handleSelectWindow}
              onRefreshWindow={refreshWindows}
            />
          )}

          {currentTab === 'overlay' && (
            <OverlayCustomization
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {currentTab === 'translation' && (
            <TranslationSettings
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {currentTab === 'glossary' && <GlossaryPage />}

          {currentTab === 'offline' && <OfflineModelManager />}

          {currentTab === 'history' && <TranslationHistoryPage />}

          {currentTab === 'diagnostics' && (
            <DiagnosticsPage
              settings={settings}
              latestTranslation={latestTranslation}
              latestOCR={latestOCR}
            />
          )}

          {currentTab === 'settings' && (
            <GeneralSettings
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onResetDefaults={handleResetDefaults}
            />
          )}
        </main>
      </div>

      {/* Render in-app preview overlay */}
      {settings.translationMode === 'subtitle' ? (
        <SubtitleOverlay
          translation={latestTranslation}
          settings={settings.overlay}
          visible={overlayVisible && isCapturing}
        />
      ) : (
        <TextReplacementOverlay
          translation={latestTranslation}
          blocks={latestTranslation?.blocks || latestOCR?.blocks || []}
          settings={settings.overlay}
          visible={overlayVisible && isCapturing}
        />
      )}
    </div>
  );
};
