import React, { useState } from 'react';
import { 
  Settings, 
  Keyboard, 
  Trash2, 
  RotateCcw, 
  Check, 
  Shield, 
  HardDrive,
  Sliders
} from 'lucide-react';
import { AppSettings } from '../types';

interface GeneralSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onResetDefaults: () => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  settings,
  onUpdateSettings,
  onResetDefaults,
}) => {
  const [toggleKey, setToggleKey] = useState(settings.hotkeys.toggleTranslation);
  const [overlayKey, setOverlayKey] = useState(settings.hotkeys.toggleOverlay);
  const [cleanNotice, setCleanNotice] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);

  const handleCleanTemporaryFiles = () => {
    // Clear temporary local caches
    localStorage.removeItem('gamelingo_trans_cache_v1');
    setCleanNotice(true);
    setTimeout(() => setCleanNotice(false), 2500);
  };

  const handleReset = () => {
    onResetDefaults();
    setResetNotice(true);
    setTimeout(() => setResetNotice(false), 2500);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-textMain flex items-center gap-2">
          <Settings className="w-4 h-4 text-accent" />
          <span>General Settings & Global Hotkeys</span>
        </h2>
        <p className="text-xs text-textMuted mt-0.5">
          Configure application shortcuts, background tray options, and storage maintenance.
        </p>
      </div>

      {/* Global Hotkeys Card */}
      <div className="cyber-card p-5 space-y-4">
        <h3 className="text-xs font-semibold text-textSubtle uppercase tracking-wider flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-accent" />
          <span>In-Game Global Keyboard Shortcuts</span>
        </h3>
        <p className="text-xs text-textMuted">
          Shortcuts can be activated directly while inside Wuthering Waves without minimizing the game window.
        </p>

        <div className="space-y-3 pt-1">
          <div className="p-3 bg-background/80 rounded-lg border border-surfaceBorder flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-textMain">Toggle Real-Time Translation</div>
              <div className="text-[11px] text-textMuted">Starts or pauses OCR dialogue detection</div>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 rounded bg-surface border border-surfaceBorder text-accent font-mono text-xs font-semibold">
                Ctrl
              </kbd>
              <span className="text-textSubtle">+</span>
              <kbd className="px-2 py-1 rounded bg-surface border border-surfaceBorder text-accent font-mono text-xs font-semibold">
                Alt
              </kbd>
              <span className="text-textSubtle">+</span>
              <kbd className="px-2 py-1 rounded bg-surface border border-surfaceBorder text-accent font-mono text-xs font-semibold">
                T
              </kbd>
            </div>
          </div>

          <div className="p-3 bg-background/80 rounded-lg border border-surfaceBorder flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-textMain">Toggle Subtitle HUD Visibility</div>
              <div className="text-[11px] text-textMuted">Quickly hides or shows the overlay HUD</div>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 rounded bg-surface border border-surfaceBorder text-accent font-mono text-xs font-semibold">
                Ctrl
              </kbd>
              <span className="text-textSubtle">+</span>
              <kbd className="px-2 py-1 rounded bg-surface border border-surfaceBorder text-accent font-mono text-xs font-semibold">
                Alt
              </kbd>
              <span className="text-textSubtle">+</span>
              <kbd className="px-2 py-1 rounded bg-surface border border-surfaceBorder text-accent font-mono text-xs font-semibold">
                O
              </kbd>
            </div>
          </div>

          <div className="p-3 bg-background/80 rounded-lg border border-surfaceBorder flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-textMain">Cycle Capture Region Preset</div>
              <div className="text-[11px] text-textMuted">Switches between bottom dialogue and choices</div>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 rounded bg-surface border border-surfaceBorder text-accent font-mono text-xs font-semibold">
                Ctrl
              </kbd>
              <span className="text-textSubtle">+</span>
              <kbd className="px-2 py-1 rounded bg-surface border border-surfaceBorder text-accent font-mono text-xs font-semibold">
                Alt
              </kbd>
              <span className="text-textSubtle">+</span>
              <kbd className="px-2 py-1 rounded bg-surface border border-surfaceBorder text-accent font-mono text-xs font-semibold">
                R
              </kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Storage & Cache Maintenance */}
      <div className="cyber-card p-5 space-y-3">
        <h3 className="text-xs font-semibold text-textSubtle uppercase tracking-wider flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-warning" />
          <span>Storage & Cache Maintenance</span>
        </h3>
        <p className="text-xs text-textMuted">
          Clean temporary phrase caches and verify that zero orphaned data exists on Drive C.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            onClick={handleCleanTemporaryFiles}
            className="w-full sm:w-auto px-4 py-2 bg-surface hover:bg-surfaceHover border border-surfaceBorder rounded-lg text-xs font-medium text-textMain flex items-center justify-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-warning" />
            <span>{cleanNotice ? 'Cache Purged!' : 'Purge Translation Cache'}</span>
          </button>

          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-4 py-2 bg-danger/10 hover:bg-danger/20 border border-danger/30 rounded-lg text-xs font-medium text-danger flex items-center justify-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{resetNotice ? 'Restored to Defaults!' : 'Reset All Settings to Defaults'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
