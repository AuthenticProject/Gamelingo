import React, { useState, useEffect, useCallback } from 'react';
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
import { TranslationService } from './services/translationService';
import { TranslationCacheService } from './services/cacheService';
import { BridgeService, BackendState } from './services/bridgeService';

import { 
  AppSettings, 
  TranslationResult, 
  OCRResult, 
  GameWindowInfo,
  BoundingBox
} from './types';

const WW_SAMPLE_DIALOGUES = [
  "Rover: Something doesn't feel right here.",
  "Yangyang: The Retroact Rain will begin soon. We must report back to Magistrate Jinhsi in Jinzhou.",
  "Chixia: Don't worry! My Dual Pistols and Fusion Forte are ready for any Tacet Discord!",
  "Baizhi: The frequency fluctuations here are abnormal. Let me analyze the Echo resonance.",
];

export const App: React.FC = () => {
  const configService = ConfigService.getInstance();
  const cacheService = TranslationCacheService.getInstance();
  const bridge = BridgeService.getInstance();

  const [settings, setSettings] = useState<AppSettings>(configService.getSettings());
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isCapturing, setIsCapturing] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);

  const [latestTranslation, setLatestTranslation] = useState<TranslationResult | null>(null);
  const [latestOCR, setLatestOCR] = useState<OCRResult | null>(null);
  const [latestBoxes, setLatestBoxes] = useState<BoundingBox[]>([]);
  const [gameWindow, setGameWindow] = useState<GameWindowInfo | null>(null);
  const [cacheStats, setCacheStats] = useState(cacheService.getStats());

  // Live polling of Native Backend Engine
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      const bState: BackendState | null = await bridge.getStatus();
      if (!mounted || !bState) return;

      setIsCapturing(bState.isCapturing);

      if (bState.gameDetected) {
        setGameWindow({
          title: bState.gameWindowTitle || 'Wuthering Waves',
          handle: 0x12040,
          processId: bState.gameProcessId || 0,
          bounds: { x: 0, y: 0, width: 1920, height: 1080 },
          dpiScale: 1.0,
          isBorderless: true,
        });
      } else {
        setGameWindow(null);
      }

      if (bState.latestOCR && bState.latestOCR.fullText) {
        setLatestOCR({
          fullText: bState.latestOCR.fullText,
          lines: bState.latestOCR.lines || [],
          confidence: 0.98,
          timestamp: Date.now(),
          changed: true,
        });
      }

      if (bState.latestTranslation && bState.latestTranslation.translatedText) {
        setLatestTranslation({
          originalText: bState.latestTranslation.originalText,
          translatedText: bState.latestTranslation.translatedText,
          engineUsed: bState.latestTranslation.engineUsed as any || 'online',
          latencyMs: bState.latestTranslation.latencyMs || 60,
          cached: false,
          timestamp: bState.latestTranslation.timestamp || Date.now(),
        });
      }

      setCacheStats(cacheService.getStats());
    }, 800);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [bridge, cacheService]);

  const handleToggleCapture = async () => {
    if (isCapturing) {
      await bridge.pauseTranslation();
      setIsCapturing(false);
    } else {
      await bridge.startTranslation();
      setIsCapturing(true);
    }
  };

  const handleStopCapture = async () => {
    await bridge.stopTranslation();
    setIsCapturing(false);
  };

  const handleUpdateSettings = (partial: Partial<AppSettings>) => {
    const updated = configService.updateSettings(partial);
    setSettings(updated);

    // Relay active region to native backend
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
    });
  };

  const handleResetDefaults = () => {
    const reset = configService.resetDefaults();
    setSettings(reset);
  };

  let testIdx = 0;
  const runTestDialogue = async () => {
    const text = WW_SAMPLE_DIALOGUES[testIdx % WW_SAMPLE_DIALOGUES.length];
    testIdx++;
    await bridge.triggerTestFrame(text);
  };

  // Global In-Game Hotkey Listeners
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
      if (e.ctrlKey && e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        const currentIndex = WUTHERING_WAVES_PRESETS.findIndex((p) => p.id === settings.selectedRegionId);
        const nextPreset = WUTHERING_WAVES_PRESETS[(currentIndex + 1) % WUTHERING_WAVES_PRESETS.length];
        handleUpdateSettings({ selectedRegionId: nextPreset.id });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.selectedRegionId, isCapturing]);

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
              onToggleCapture={handleToggleCapture}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              latestTranslation={latestTranslation}
              latestOCR={latestOCR}
              gameWindow={gameWindow}
              cacheStats={cacheStats}
              onRunTestTranslation={runTestDialogue}
            />
          )}

          {currentTab === 'capture' && (
            <CaptureSettings
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              gameWindow={gameWindow}
              onRefreshWindow={() => {}}
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

      {/* Render local in-app preview overlay */}
      {settings.translationMode === 'subtitle' ? (
        <SubtitleOverlay
          translation={latestTranslation}
          settings={settings.overlay}
          visible={overlayVisible && isCapturing}
        />
      ) : (
        <TextReplacementOverlay
          translation={latestTranslation}
          boxes={latestBoxes}
          settings={settings.overlay}
          visible={overlayVisible && isCapturing}
        />
      )}
    </div>
  );
};
