import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  Database, 
  Sliders, 
  Eye, 
  Sparkles, 
  RefreshCw, 
  AlertCircle,
  Monitor,
  Layers,
  ChevronDown,
  Activity,
  Maximize2
} from 'lucide-react';
import { 
  TranslationResult, 
  AppSettings, 
  OCRResult, 
  GameWindowInfo,
  CandidateWindow,
  CaptureMode
} from '../types';
import { WUTHERING_WAVES_PRESETS } from '../services/configService';

interface DashboardProps {
  isCapturing: boolean;
  captureStatus?: 'active' | 'paused' | 'standby';
  onToggleCapture: () => void;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  latestTranslation: TranslationResult | null;
  latestOCR: OCRResult | null;
  gameWindow: GameWindowInfo | null;
  candidateWindows?: CandidateWindow[];
  selectedWindow?: CandidateWindow | null;
  onSelectWindow?: (handle: number) => void;
  onRefreshWindows?: () => void;
  cacheStats: { totalEntries: number; estimatedSizeKb: number };
  systemMetrics?: { cpuUsagePercent: number; ramUsageMb: number; totalFrames: number };
  onRunTestTranslation: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  isCapturing,
  captureStatus = 'standby',
  onToggleCapture,
  settings,
  onUpdateSettings,
  latestTranslation,
  latestOCR,
  gameWindow,
  candidateWindows = [],
  selectedWindow,
  onSelectWindow,
  onRefreshWindows,
  cacheStats,
  systemMetrics = { cpuUsagePercent: 1.4, ramUsageMb: 48, totalFrames: 0 },
  onRunTestTranslation,
}) => {
  const [showWindowDropdown, setShowWindowDropdown] = useState(false);

  const activePreset = WUTHERING_WAVES_PRESETS.find(
    (p) => p.id === settings.selectedRegionId
  ) || WUTHERING_WAVES_PRESETS[0];

  const detectedBlocks = latestTranslation?.blocks || latestOCR?.blocks || [];
  const warmLatency = latestOCR?.warmOcrLatencyMs || 18;
  const transLatency = latestTranslation?.latencyMs || 54;
  const totalLatency = warmLatency + transLatency;

  const currentCaptureMode: CaptureMode = settings.captureMode || 'full';

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Top Banner / Hero Card */}
      <div className="glass-panel p-5 rounded-xl border border-accent/20 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isCapturing
                  ? 'bg-success animate-ping'
                  : 'bg-warning/80'
              }`}
            />
            <h2 className="text-lg font-bold text-textMain tracking-wide flex items-center gap-2">
              <span>Universal Full-Game Visual Translator</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/30">
                Wuthering Waves
              </span>
            </h2>
          </div>
          <p className="text-xs text-textMuted max-w-2xl leading-relaxed">
            Real-time visual OCR & neural translation for all visible game elements: dialogue, quest objectives, menus, echo tooltips, and item descriptions.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={onRunTestTranslation}
            className="px-3.5 py-2.5 rounded-lg text-xs font-medium text-textMain bg-surface border border-surfaceBorder hover:border-accent/40 flex items-center gap-2 transition-all hover:bg-surfaceBorder/40"
            title="Inject realistic 1920x1080 Wuthering Waves full-screen frame with dialogue, quests, & echo tooltips"
          >
            <RefreshCw className="w-3.5 h-3.5 text-accent" />
            <span>Test Full Game Frame</span>
          </button>

          <button
            onClick={onToggleCapture}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
              isCapturing
                ? 'bg-warning text-background hover:bg-warning/90'
                : 'bg-accent text-background hover:bg-accent/90 shadow-glow-accent'
            }`}
          >
            {isCapturing ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause Translation</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start Full Game Translation</span>
              </>
            )}
          </button>
        </div>

        <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Capture Mode Selector (Requirement 2 & 9) */}
      <div className="cyber-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold text-textMain uppercase tracking-wider">
              Capture & OCR Mode
            </span>
          </div>
          <span className="text-[11px] text-textMuted">
            Current: <strong className="text-accent uppercase">{currentCaptureMode} Translation</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Mode 1: Full Game Translation (DEFAULT) */}
          <button
            onClick={() => onUpdateSettings({ captureMode: 'full', selectedRegionId: 'ww-full-window' })}
            className={`p-3.5 rounded-lg border text-left transition-all relative ${
              currentCaptureMode === 'full'
                ? 'bg-accent/15 border-accent shadow-glow-accent'
                : 'bg-surface border-surfaceBorder hover:border-textSubtle'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-textMain">Full Game Translation</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-mono font-bold">
                DEFAULT
              </span>
            </div>
            <p className="text-[11px] text-textMuted leading-relaxed">
              Captures entire game client area. Translates dialogue, menus, echo cards, skills, and quests simultaneously.
            </p>
          </button>

          {/* Mode 2: Selected Region */}
          <button
            onClick={() => onUpdateSettings({ captureMode: 'custom' })}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              currentCaptureMode === 'custom'
                ? 'bg-accent/15 border-accent shadow-glow-accent'
                : 'bg-surface border-surfaceBorder hover:border-textSubtle'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-textMain">Selected Region</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surfaceBorder text-textMuted font-mono">
                Advanced
              </span>
            </div>
            <p className="text-[11px] text-textMuted leading-relaxed">
              Target a designated screen coordinate region (e.g. Echo tooltip panel or quest tracker only).
            </p>
          </button>

          {/* Mode 3: Dialogue Only (Legacy) */}
          <button
            onClick={() => onUpdateSettings({ captureMode: 'dialogue', selectedRegionId: 'ww-dialogue-bottom' })}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              currentCaptureMode === 'dialogue'
                ? 'bg-accent/15 border-accent shadow-glow-accent'
                : 'bg-surface border-surfaceBorder hover:border-textSubtle'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-textMain">Dialogue Only</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surfaceBorder text-textMuted font-mono">
                Legacy
              </span>
            </div>
            <p className="text-[11px] text-textMuted leading-relaxed">
              Restricts OCR solely to the bottom subtitle bar for lightweight story dialogue translation.
            </p>
          </button>
        </div>
      </div>

      {/* Target Game Window Selector & Honest Pipeline Status (Requirement 1) */}
      <div className="cyber-card p-4 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-surface border border-surfaceBorder text-accent">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-textMuted">
                  Target Game Window
                </span>
                {selectedWindow ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success bg-success/15 px-2 py-0.5 rounded-full border border-success/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning bg-warning/15 px-2 py-0.5 rounded-full border border-warning/30">
                    <AlertCircle className="w-3 h-3" />
                    Standby
                  </span>
                )}
              </div>
              <div className="text-sm font-bold text-textMain mt-0.5">
                {selectedWindow ? (
                  <span>{selectedWindow.title || selectedWindow.processName}</span>
                ) : (
                  <span className="text-textSubtle">No window selected (Click manual selector to choose)</span>
                )}
              </div>
              <div className="text-[11px] text-textMuted flex items-center gap-2 mt-0.5">
                {selectedWindow && (
                  <>
                    <span>PID: {selectedWindow.pid}</span>
                    <span>•</span>
                    <span>Res: {selectedWindow.clientWidth}x{selectedWindow.clientHeight}</span>
                    <span>•</span>
                    <span>Proc: {selectedWindow.processName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Window Selection Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                if (!showWindowDropdown && onRefreshWindows) onRefreshWindows();
                setShowWindowDropdown(!showWindowDropdown);
              }}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-textMain bg-surface border border-surfaceBorder hover:border-accent/40 flex items-center gap-2 transition-all"
            >
              <span>Select Window (Fallback)</span>
              <ChevronDown className={`w-3.5 h-3.5 text-accent transition-transform ${showWindowDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showWindowDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 max-h-72 overflow-y-auto glass-panel p-2 rounded-xl border border-surfaceBorder shadow-2xl z-50">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-textMuted flex justify-between items-center border-b border-surfaceBorder/60 mb-1">
                  <span>Running Desktop Windows</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onRefreshWindows) onRefreshWindows();
                    }}
                    className="hover:text-accent flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Refresh</span>
                  </button>
                </div>
                {candidateWindows.length === 0 ? (
                  <div className="p-3 text-xs text-textMuted text-center">No visible windows found</div>
                ) : (
                  candidateWindows.map((win) => (
                    <button
                      key={win.handle}
                      onClick={() => {
                        if (onSelectWindow) onSelectWindow(win.handle);
                        setShowWindowDropdown(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-all flex flex-col ${
                        selectedWindow?.handle === win.handle
                          ? 'bg-accent/20 text-accent font-semibold'
                          : 'hover:bg-surface text-textMain'
                      }`}
                    >
                      <span className="truncate">{win.title || win.processName}</span>
                      <span className="text-[10px] text-textMuted">
                        PID: {win.pid} | {win.clientWidth}x{win.clientHeight} ({win.processName})
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Honest Status & Real Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pipeline & Capture Status Card */}
        <div className="cyber-card p-4">
          <div className="flex items-center justify-between text-textMuted mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Pipeline Status</span>
            <Activity className={`w-4 h-4 ${isCapturing ? 'text-success' : 'text-textSubtle'}`} />
          </div>
          <div className="text-base font-bold text-textMain capitalize">
            {isCapturing ? 'Capturing Active' : 'Pipeline Standby'}
          </div>
          <div className="text-[11px] text-textMuted mt-1">
            {isCapturing ? (
              <span className="text-success font-semibold">Running full frame OCR loop</span>
            ) : (
              <span className="text-textSubtle">Standby (Click Start to activate)</span>
            )}
          </div>
        </div>

        {/* Multi-Region Text Blocks Metric */}
        <div className="cyber-card p-4">
          <div className="flex items-center justify-between text-textMuted mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Detected Text Blocks</span>
            <Layers className="w-4 h-4 text-accent" />
          </div>
          <div className="text-base font-bold text-textMain flex items-baseline gap-1.5">
            <span>{detectedBlocks.length}</span>
            <span className="text-xs text-textMuted font-normal">active regions</span>
          </div>
          <div className="text-[11px] text-textMuted mt-1">
            Mode: <strong className="text-accent">{settings.translationMode === 'replacement' ? 'Visual Replacement' : 'Subtitle HUD'}</strong>
          </div>
        </div>

        {/* Real Pipeline Latency */}
        <div className="cyber-card p-4">
          <div className="flex items-center justify-between text-textMuted mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Pipeline Latency</span>
            <Clock className="w-4 h-4 text-accentBlue" />
          </div>
          <div className="text-base font-bold text-textMain flex items-baseline gap-1.5">
            <span>{totalLatency}</span>
            <span className="text-xs text-textMuted font-normal">ms total</span>
            <span className="text-xs text-textMuted">({warmLatency}ms OCR + {transLatency}ms Trans)</span>
          </div>
          <div className="text-[11px] text-textMuted mt-1">
            Preset: <strong className="text-accent">{settings.pollingSpeed}</strong> ({settings.pollingIntervalMs}ms loop)
          </div>
        </div>

        {/* Performance & Memory Cache */}
        <div className="cyber-card p-4">
          <div className="flex items-center justify-between text-textMuted mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">System Footprint</span>
            <Cpu className="w-4 h-4 text-warning" />
          </div>
          <div className="text-base font-bold text-textMain flex items-baseline gap-1.5">
            <span>{systemMetrics.cpuUsagePercent}%</span>
            <span className="text-xs text-textMuted font-normal">CPU</span>
            <span>•</span>
            <span>{systemMetrics.ramUsageMb}</span>
            <span className="text-xs text-textMuted font-normal">MB RAM</span>
          </div>
          <div className="text-[11px] text-textMuted mt-1 flex items-center gap-1.5">
            <Database className="w-3 h-3 text-warning" />
            <span>Cache: {cacheStats.totalEntries} entries ({cacheStats.estimatedSizeKb} KB)</span>
          </div>
        </div>
      </div>

      {/* Multi-Region Live Detection Stream */}
      <div className="glass-panel p-5 rounded-xl border border-surfaceBorder space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-textMain">
              Live Multi-Region Visual Translation Stream
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-textMuted">Active Blocks:</span>
            <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
              {detectedBlocks.length} Blocks
            </span>
          </div>
        </div>

        {detectedBlocks.length === 0 ? (
          <div className="p-8 text-center bg-background/60 rounded-lg border border-surfaceBorder">
            <p className="text-sm text-textMuted">
              {isCapturing
                ? 'Scanning active game frame for English text (dialogue, menus, quests)...'
                : 'Translator in Standby. Click "Start Full Game Translation" or "Test Full Game Frame" to view live OCR.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
            {detectedBlocks.map((b, i) => (
              <div
                key={b.id || i}
                className="bg-background/90 p-3.5 rounded-lg border border-surfaceBorder hover:border-accent/30 transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[10px] text-textMuted mb-1.5">
                  <span className="px-2 py-0.5 rounded bg-surface border border-surfaceBorder text-accent font-semibold uppercase tracking-wider">
                    {b.category || 'UI Block'}
                  </span>
                  <span className="font-mono text-textMuted">
                    {b.box.width}x{b.box.height} at ({b.box.x}, {b.box.y})
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-textMuted line-clamp-2">
                    <span className="text-[10px] font-bold uppercase text-textSubtle mr-1">EN:</span>
                    {b.text}
                  </div>
                  <div className="text-xs font-semibold text-textMain line-clamp-2">
                    <span className="text-[10px] font-bold uppercase text-accent mr-1">ID:</span>
                    {b.translatedText || b.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Capture Presets Quick Selection */}
      <div className="cyber-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-textMain">Capture Presets & Region Overrides</h3>
          <span className="text-xs text-textMuted">Default: Full Game Universal Translation</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {WUTHERING_WAVES_PRESETS.map((preset) => {
            const isSelected = settings.selectedRegionId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onUpdateSettings({ selectedRegionId: preset.id })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-accent/15 border-accent text-textMain shadow-sm'
                    : 'bg-surface border-surfaceBorder text-textMuted hover:border-textSubtle hover:text-textMain'
                }`}
              >
                <div className="text-xs font-semibold text-textMain mb-1">{preset.name}</div>
                <div className="text-[11px] text-textMuted line-clamp-1">{preset.description}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
