import React from 'react';
import { Play, Pause, Square, Zap, Globe, HardDrive, AlertCircle } from 'lucide-react';
import { TranslationMode, TranslationEngineType } from '../types';

interface HeaderProps {
  isCapturing: boolean;
  onToggleCapture: () => void;
  onStopCapture: () => void;
  mode: TranslationMode;
  onSelectMode: (mode: TranslationMode) => void;
  engine: TranslationEngineType;
  onSelectEngine: (engine: TranslationEngineType) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isCapturing,
  onToggleCapture,
  onStopCapture,
  mode,
  onSelectMode,
  engine,
  onSelectEngine,
}) => {
  return (
    <header className="h-16 bg-surface/90 border-b border-surfaceBorder px-6 flex items-center justify-between backdrop-blur-md shrink-0">
      {/* Translation Master Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleCapture}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
            isCapturing
              ? 'bg-warning text-background hover:bg-warning/90'
              : 'bg-accent text-background hover:bg-accent/90 shadow-glow-accent'
          }`}
        >
          {isCapturing ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause Translation</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Translation</span>
            </>
          )}
        </button>

        {isCapturing && (
          <button
            onClick={onStopCapture}
            className="px-3 py-2 rounded-lg text-xs font-medium text-danger bg-danger/10 border border-danger/25 hover:bg-danger/20 flex items-center gap-1.5 transition-all"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Stop</span>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-textMuted bg-background/50 px-2.5 py-1.5 rounded border border-surfaceBorder">
          <span className="text-textSubtle">Hotkey:</span>
          <kbd className="px-1.5 py-0.5 rounded bg-surface text-accent text-[10px] font-mono border border-surfaceBorder">Ctrl+Alt+T</kbd>
        </div>
      </div>

      {/* Mode & Engine Selector Pills */}
      <div className="flex items-center gap-3">
        {/* Mode Toggle */}
        <div className="bg-background/80 p-1 rounded-lg border border-surfaceBorder flex items-center text-xs">
          <button
            onClick={() => onSelectMode('subtitle')}
            className={`px-3 py-1 rounded-md transition-all font-medium ${
              mode === 'subtitle'
                ? 'bg-accent/20 text-accent border border-accent/40 shadow-sm'
                : 'text-textMuted hover:text-textMain'
            }`}
          >
            Subtitle HUD
          </button>
          <button
            onClick={() => onSelectMode('replacement')}
            className={`px-3 py-1 rounded-md transition-all font-medium ${
              mode === 'replacement'
                ? 'bg-accent/20 text-accent border border-accent/40 shadow-sm'
                : 'text-textMuted hover:text-textMain'
            }`}
          >
            Text Replacement
          </button>
        </div>

        {/* Engine Toggle */}
        <div className="bg-background/80 p-1 rounded-lg border border-surfaceBorder flex items-center text-xs">
          <button
            onClick={() => onSelectEngine('online')}
            title="Online Cloud API (Google / DeepL / LibreTranslate)"
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all font-medium ${
              engine === 'online'
                ? 'bg-accentBlue/20 text-accentBlue border border-accentBlue/40'
                : 'text-textMuted hover:text-textMain'
            }`}
          >
            <Globe className="w-3 h-3" />
            <span>Online</span>
          </button>
          <button
            onClick={() => onSelectEngine('hybrid')}
            title="Hybrid: Cache + Online (Recommended)"
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all font-medium ${
              engine === 'hybrid'
                ? 'bg-accent/20 text-accent border border-accent/40'
                : 'text-textMuted hover:text-textMain'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Hybrid</span>
          </button>
          <button
            disabled
            title="Offline translation engine is currently not installed. Please download an offline model in Model Manager."
            className="px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all font-medium text-textSubtle/50 cursor-not-allowed"
          >
            <HardDrive className="w-3 h-3" />
            <span>Offline (Not Installed)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
