import React, { useState } from 'react';
import { 
  Crop, 
  Monitor, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  Sliders, 
  Info,
  Maximize2
} from 'lucide-react';
import { AppSettings, GameWindowInfo, CaptureRegion } from '../types';
import { WUTHERING_WAVES_PRESETS } from '../services/configService';

interface CaptureSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  gameWindow: GameWindowInfo | null;
  onRefreshWindow: () => void;
}

export const CaptureSettings: React.FC<CaptureSettingsProps> = ({
  settings,
  onUpdateSettings,
  gameWindow,
  onRefreshWindow,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState(settings.selectedRegionId);

  const activePreset = WUTHERING_WAVES_PRESETS.find(
    (p) => p.id === selectedPresetId
  ) || WUTHERING_WAVES_PRESETS[0];

  const handleSelectPreset = (preset: CaptureRegion) => {
    setSelectedPresetId(preset.id);
    onUpdateSettings({ selectedRegionId: preset.id });
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-textMain flex items-center gap-2">
            <Crop className="w-4 h-4 text-accent" />
            <span>Screen Capture & Window Targeting</span>
          </h2>
          <p className="text-xs text-textMuted mt-0.5">
            Configure target game window detection and selective dialogue region cropping.
          </p>
        </div>
        <button
          onClick={onRefreshWindow}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-textMain bg-surface border border-surfaceBorder hover:border-accent/40 flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-accent" />
          <span>Rescan Windows</span>
        </button>
      </div>

      {/* Target Game Window Card */}
      <div className="glass-panel p-5 rounded-xl border border-surfaceBorder space-y-4">
        <div className="flex items-center justify-between border-b border-surfaceBorder pb-3">
          <div className="flex items-center gap-2.5">
            <Monitor className="w-5 h-5 text-accent" />
            <div>
              <div className="text-sm font-semibold text-textMain">Detected Game Window</div>
              <div className="text-[11px] text-textMuted">Windows Graphics Capture Target</div>
            </div>
          </div>
          <span className="text-xs text-success bg-success/15 px-2 py-0.5 rounded border border-success/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Active Target</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-background/80 p-3 rounded-lg border border-surfaceBorder">
            <div className="text-[11px] text-textSubtle uppercase">Process / Window</div>
            <div className="text-xs font-bold text-textMain mt-1 truncate">
              {gameWindow ? gameWindow.title : 'Client-Win64-Shipping.exe'}
            </div>
          </div>

          <div className="bg-background/80 p-3 rounded-lg border border-surfaceBorder">
            <div className="text-[11px] text-textSubtle uppercase">Resolution</div>
            <div className="text-xs font-bold text-textMain mt-1">
              {gameWindow ? `${gameWindow.bounds.width} x ${gameWindow.bounds.height}` : '1920 x 1080'}
            </div>
          </div>

          <div className="bg-background/80 p-3 rounded-lg border border-surfaceBorder">
            <div className="text-[11px] text-textSubtle uppercase">Display Mode</div>
            <div className="text-xs font-bold text-accent mt-1">
              {gameWindow?.isBorderless ? 'Borderless Windowed' : 'Windowed'}
            </div>
          </div>

          <div className="bg-background/80 p-3 rounded-lg border border-surfaceBorder">
            <div className="text-[11px] text-textSubtle uppercase">DPI Scaling</div>
            <div className="text-xs font-bold text-textMain mt-1">
              {gameWindow ? `${Math.round(gameWindow.dpiScale * 100)}%` : '100%'}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-textMuted bg-surface/50 p-3 rounded-lg border border-surfaceBorder flex items-start gap-2">
          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <span>
            Wuthering Waves must be running in <strong>Borderless Windowed</strong> or <strong>Windowed</strong> mode for the transparent overlay to render smoothly over gameplay.
          </span>
        </div>
      </div>

      {/* Interactive Region Visualizer Sandbox */}
      <div className="cyber-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-textMain flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              <span>Capture Region Visualizer (Wuthering Waves 16:9 Frame)</span>
            </h3>
            <p className="text-[11px] text-textMuted mt-0.5">
              Only the highlighted box will be cropped and passed to Windows OCR, saving APU resources.
            </p>
          </div>
          <span className="text-xs text-accent font-mono bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
            {activePreset.name}
          </span>
        </div>

        {/* 16:9 Aspect Ratio Frame */}
        <div className="w-full aspect-video bg-background/95 rounded-lg border-2 border-surfaceBorder relative overflow-hidden shadow-inner flex items-center justify-center">
          {/* Simulated in-game backdrop elements */}
          <div className="absolute inset-0 opacity-15 pointer-events-none flex flex-col justify-between p-4">
            <div className="flex justify-between items-center text-[10px] text-textMuted font-mono">
              <span>HP 100%</span>
              <span>Jinzhou Outskirts</span>
            </div>
            <div className="text-center text-[10px] text-textSubtle font-mono">
              [Simulated Wuthering Waves 1080p Screen]
            </div>
            <div className="flex justify-between items-center text-[10px] text-textMuted font-mono">
              <span>Rover Level 80</span>
              <span>Forte Energy: 100%</span>
            </div>
          </div>

          {/* Dynamic Active Crop Bounding Box */}
          <div
            className="absolute border-2 border-accent bg-accent/20 rounded backdrop-blur-xs transition-all duration-300 shadow-glow-accent flex flex-col items-center justify-center p-2 text-center"
            style={{
              left: `${activePreset.xRatio * 100}%`,
              top: `${activePreset.yRatio * 100}%`,
              width: `${activePreset.wRatio * 100}%`,
              height: `${activePreset.hRatio * 100}%`,
            }}
          >
            <div className="text-[11px] font-bold text-accent tracking-wide uppercase">
              {activePreset.name}
            </div>
            <div className="text-[9px] text-textMuted font-mono">
              Crop: {Math.round(activePreset.wRatio * 1920)} x {Math.round(activePreset.hRatio * 1080)} px
            </div>
          </div>
        </div>
      </div>

      {/* Preset List */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-textSubtle uppercase tracking-wider">
          Available Wuthering Waves Dialogue Presets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {WUTHERING_WAVES_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-accent/15 border-accent text-textMain shadow-md'
                    : 'bg-surface border-surfaceBorder text-textMuted hover:border-textSubtle hover:text-textMain'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-textMain">{preset.name}</span>
                  {isSelected && (
                    <span className="text-[10px] text-accent font-semibold px-1.5 py-0.5 rounded bg-accent/20 border border-accent/40">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-textMuted">{preset.description}</p>
                <div className="text-[10px] text-textSubtle font-mono mt-2">
                  Bounds: x={Math.round(preset.xRatio * 100)}%, y={Math.round(preset.yRatio * 100)}%, w={Math.round(preset.wRatio * 100)}%, h={Math.round(preset.hRatio * 100)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
