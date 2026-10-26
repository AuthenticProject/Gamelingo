import React from 'react';
import { 
  Sliders, 
  Type, 
  Palette, 
  Layers, 
  Eye, 
  Clock, 
  Check, 
  MousePointer
} from 'lucide-react';
import { AppSettings, TranslationMode } from '../types';

interface OverlayCustomizationProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
}

export const OverlayCustomization: React.FC<OverlayCustomizationProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const overlay = settings.overlay;

  const updateOverlay = (partial: Partial<AppSettings['overlay']>) => {
    onUpdateSettings({
      overlay: {
        ...overlay,
        ...partial,
      },
    });
  };

  const sampleTranslation = 'Rover, dengarkan gema resonansi dari Sonoro Sphere di depanmu.';

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-textMain flex items-center gap-2">
          <Sliders className="w-4 h-4 text-accent" />
          <span>Overlay Customization & Typography</span>
        </h2>
        <p className="text-xs text-textMuted mt-0.5">
          Fine-tune the transparent in-game HUD subtitles, typography, shadows, and click-through behavior.
        </p>
      </div>

      {/* Live Overlay Sandbox Preview */}
      <div className="glass-panel p-5 rounded-xl border border-surfaceBorder space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-textSubtle uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-accent" />
            <span>Live HUD Preview Sandbox</span>
          </h3>
          <span className="text-[11px] text-textMuted">Renders exactly as displayed over the game</span>
        </div>

        {/* Preview Frame */}
        <div className="w-full h-48 rounded-lg bg-gradient-to-b from-[#0F1722] to-[#0B1018] border border-surfaceBorder relative flex items-center justify-center p-6 overflow-hidden">
          {/* Faint in-game dialogue backdrop representation */}
          <div className="absolute inset-0 bg-[radial-gradient(#172231_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          {/* Rendered Subtitle Box */}
          <div
            className="px-6 py-3.5 rounded-xl border border-accent/20 backdrop-blur-md shadow-2xl text-center transition-all"
            style={{
              backgroundColor: `rgba(11, 16, 24, ${overlay.backgroundOpacity})`,
              maxWidth: `${overlay.maxWidthPercent}%`,
            }}
          >
            <div
              style={{
                fontSize: `${overlay.fontSize}px`,
                fontFamily: overlay.fontFamily,
                color: overlay.textColor,
                textShadow: overlay.textShadow
                  ? '0 0 10px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.9), 0 0 2px #000'
                  : 'none',
                WebkitTextStroke: overlay.textOutline ? '1px rgba(0,0,0,0.85)' : 'none',
              }}
              className="font-medium leading-relaxed tracking-wide select-none"
            >
              {sampleTranslation}
            </div>

            <div className="mt-1 flex items-center justify-center gap-2 text-[10px] text-textMuted/70 font-mono">
              <span className="text-accent uppercase">HYBRID</span>
              <span>•</span>
              <span>128ms</span>
              <span>•</span>
              <span className="text-success">Active Preview</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customization Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Typography Settings */}
        <div className="cyber-card p-5 space-y-4">
          <h3 className="text-xs font-semibold text-textSubtle uppercase tracking-wider flex items-center gap-2">
            <Type className="w-4 h-4 text-accent" />
            <span>Typography & Styling</span>
          </h3>

          {/* Font Size Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-textMuted">Font Size</span>
              <span className="text-accent font-mono font-semibold">{overlay.fontSize} px</span>
            </div>
            <input
              type="range"
              min="16"
              max="36"
              value={overlay.fontSize}
              onChange={(e) => updateOverlay({ fontSize: Number(e.target.value) })}
              className="w-full accent-accent h-1.5 bg-background rounded-lg cursor-pointer"
            />
          </div>

          {/* Font Family Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-textMuted">Font Family</label>
            <select
              value={overlay.fontFamily}
              onChange={(e) => updateOverlay({ fontFamily: e.target.value })}
              className="w-full bg-background border border-surfaceBorder rounded-lg px-3 py-2 text-xs text-textMain focus:outline-none focus:border-accent"
            >
              <option value="Inter, sans-serif">Inter (Clean Modern Gaming)</option>
              <option value="'JetBrains Mono', monospace">JetBrains Mono (Tech HUD)</option>
              <option value="'Segoe UI', sans-serif">Segoe UI (Windows Default)</option>
              <option value="system-ui, sans-serif">System UI</option>
            </select>
          </div>

          {/* Text Color */}
          <div className="space-y-1.5">
            <label className="text-xs text-textMuted">Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={overlay.textColor}
                onChange={(e) => updateOverlay({ textColor: e.target.value })}
                className="w-8 h-8 rounded border border-surfaceBorder bg-background cursor-pointer p-0.5"
              />
              <span className="text-xs text-textMain font-mono">{overlay.textColor}</span>
            </div>
          </div>

          {/* Toggles: Shadow and Outline */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => updateOverlay({ textShadow: !overlay.textShadow })}
              className={`p-3 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                overlay.textShadow
                  ? 'bg-accent/15 border-accent text-textMain'
                  : 'bg-background border-surfaceBorder text-textMuted'
              }`}
            >
              <span>Drop Shadow</span>
              {overlay.textShadow && <Check className="w-3.5 h-3.5 text-accent" />}
            </button>

            <button
              onClick={() => updateOverlay({ textOutline: !overlay.textOutline })}
              className={`p-3 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                overlay.textOutline
                  ? 'bg-accent/15 border-accent text-textMain'
                  : 'bg-background border-surfaceBorder text-textMuted'
              }`}
            >
              <span>Text Outline</span>
              {overlay.textOutline && <Check className="w-3.5 h-3.5 text-accent" />}
            </button>
          </div>
        </div>

        {/* Layout & Transparency */}
        <div className="cyber-card p-5 space-y-4">
          <h3 className="text-xs font-semibold text-textSubtle uppercase tracking-wider flex items-center gap-2">
            <Palette className="w-4 h-4 text-accent" />
            <span>Background & HUD Behavior</span>
          </h3>

          {/* Background Opacity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-textMuted">Backdrop Opacity</span>
              <span className="text-accent font-mono font-semibold">
                {Math.round(overlay.backgroundOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={overlay.backgroundOpacity}
              onChange={(e) => updateOverlay({ backgroundOpacity: Number(e.target.value) })}
              className="w-full accent-accent h-1.5 bg-background rounded-lg cursor-pointer"
            />
          </div>

          {/* Display Duration */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-textMuted">Subtitle Linger Duration</span>
              <span className="text-accent font-mono font-semibold">
                {overlay.displayDurationMs / 1000}s
              </span>
            </div>
            <input
              type="range"
              min="2000"
              max="12000"
              step="500"
              value={overlay.displayDurationMs}
              onChange={(e) => updateOverlay({ displayDurationMs: Number(e.target.value) })}
              className="w-full accent-accent h-1.5 bg-background rounded-lg cursor-pointer"
            />
          </div>

          {/* Max Width */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-textMuted">Maximum Text Width</span>
              <span className="text-accent font-mono font-semibold">
                {overlay.maxWidthPercent}%
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="95"
              step="5"
              value={overlay.maxWidthPercent}
              onChange={(e) => updateOverlay({ maxWidthPercent: Number(e.target.value) })}
              className="w-full accent-accent h-1.5 bg-background rounded-lg cursor-pointer"
            />
          </div>

          {/* Click-through mode indicator */}
          <div className="pt-2">
            <div className="p-3 bg-background/80 rounded-lg border border-surfaceBorder flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-accent" />
                <div>
                  <div className="text-xs font-semibold text-textMain">Input Click-Through</div>
                  <div className="text-[10px] text-textMuted">WS_EX_TRANSPARENT flag enabled</div>
                </div>
              </div>
              <span className="text-[10px] text-success bg-success/15 px-2 py-0.5 rounded border border-success/30 font-semibold">
                Pass-through ON
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
