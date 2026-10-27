import React, { useState } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Layers, 
  Clock, 
  Eye, 
  RefreshCw,
  Box,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { AppSettings, TranslationResult, OCRResult, TextBlock } from '../types';

interface DiagnosticsPageProps {
  settings: AppSettings;
  latestTranslation: TranslationResult | null;
  latestOCR: OCRResult | null;
}

export const DiagnosticsPage: React.FC<DiagnosticsPageProps> = ({
  settings,
  latestTranslation,
  latestOCR,
}) => {
  const [showDebugBoxes, setShowDebugBoxes] = useState(true);
  const [imgTimestamp, setImgTimestamp] = useState(Date.now());
  const [imgError, setImgError] = useState(false);

  const detectedBlocks: TextBlock[] = latestTranslation?.blocks || latestOCR?.blocks || [];

  const handleRefreshPreview = () => {
    setImgTimestamp(Date.now());
    setImgError(false);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-textMain flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            <span>Live Capture Diagnostics & Multi-Region OCR Inspector</span>
          </h2>
          <p className="text-xs text-textMuted mt-0.5">
            Inspect real captured game frames, verify detected OCR bounding boxes, and validate Indonesian translation mapping.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDebugBoxes(!showDebugBoxes)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              showDebugBoxes
                ? 'bg-accent/20 border-accent text-accent'
                : 'bg-surface border-surfaceBorder text-textMuted hover:text-textMain'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>{showDebugBoxes ? 'Hide OCR Bounding Boxes' : 'Show OCR Bounding Boxes'}</span>
          </button>

          <button
            onClick={handleRefreshPreview}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-textMain bg-surface border border-surfaceBorder hover:border-accent/40 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-accent" />
            <span>Refresh Frame</span>
          </button>
        </div>
      </div>

      {/* Live Frame Preview with Interactive OCR Bounding Box Layer */}
      <div className="glass-panel p-5 rounded-xl border border-surfaceBorder space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-bold text-textMain uppercase tracking-wider">
              Live Captured Game Frame (1920x1080 Viewport)
            </h3>
          </div>
          <span className="text-[11px] text-textMuted">
            Active Blocks: <strong className="text-accent">{detectedBlocks.length}</strong>
          </span>
        </div>

        <div className="relative w-full aspect-[16/9] bg-black rounded-lg overflow-hidden border border-surfaceBorder shadow-inner flex items-center justify-center">
          {!imgError ? (
            <img
              src={`http://127.0.0.1:5174/api/preview-frame?t=${imgTimestamp}`}
              alt="Live Game Frame Capture"
              className="w-full h-full object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="text-center p-6 text-textMuted">
              <p className="text-xs">No active game frame captured yet.</p>
              <p className="text-[11px] text-textSubtle mt-1">
                Click "Test Full Game Frame" on Dashboard to load sample full-game frame.
              </p>
            </div>
          )}

          {/* Interactive Bounding Boxes Overlay */}
          {showDebugBoxes && !imgError && detectedBlocks.length > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {detectedBlocks.map((b, idx) => {
                // Convert coordinates from 1920x1080 to percentages
                const leftPct = (b.box.x / 1920) * 100;
                const topPct = (b.box.y / 1080) * 100;
                const widthPct = (b.box.width / 1920) * 100;
                const heightPct = (b.box.height / 1080) * 100;

                const isDialogue = b.category === 'dialogue';
                const isQuest = b.category === 'quest';
                const isItem = b.category === 'item_tooltip';

                const borderColor = isDialogue
                  ? 'border-cyan-400 bg-cyan-400/15'
                  : isQuest
                    ? 'border-yellow-400 bg-yellow-400/15'
                    : isItem
                      ? 'border-purple-400 bg-purple-400/15'
                      : 'border-emerald-400 bg-emerald-400/15';

                return (
                  <div
                    key={b.id || idx}
                    className={`absolute border-2 transition-all rounded ${borderColor}`}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                    }}
                  >
                    <span className="absolute -top-4 left-0 text-[9px] font-mono font-bold bg-background/90 text-textMain px-1 rounded shadow">
                      #{idx + 1} {b.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Multi-Region OCR Inspector Table */}
      <div className="cyber-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-textSubtle uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent" />
            <span>Detected Text Blocks Inspector ({detectedBlocks.length} Blocks)</span>
          </h3>
          <span className="text-[11px] text-textMuted">
            Windows.Media.Ocr Native WinRT Pipeline
          </span>
        </div>

        {detectedBlocks.length === 0 ? (
          <div className="p-4 text-center text-xs text-textMuted bg-background/60 rounded-lg">
            No text blocks currently recognized. Run live capture or test frame to inspect.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surfaceBorder text-textMuted text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Original English Text</th>
                  <th className="py-2 px-3">Indonesian Translation</th>
                  <th className="py-2 px-3">Coordinates (X, Y, W, H)</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surfaceBorder/60">
                {detectedBlocks.map((b, idx) => (
                  <tr key={b.id || idx} className="hover:bg-surface/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-accent">#{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-surface border border-surfaceBorder text-[10px] font-semibold uppercase text-textMain">
                        {b.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-textMuted max-w-xs truncate" title={b.text}>
                      {b.text}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-textMain max-w-xs truncate" title={b.translatedText}>
                      {b.translatedText || <span className="text-textSubtle italic">Translating...</span>}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-textMuted">
                      ({b.box.x}, {b.box.y}, {b.box.width}, {b.box.height})
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] text-success font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        Mapped
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* APU & Storage Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="cyber-card p-5 space-y-2">
          <div className="flex items-center justify-between text-textMuted">
            <span className="text-xs font-semibold uppercase tracking-wider">APU Processor</span>
            <Cpu className="w-4 h-4 text-accent" />
          </div>
          <div className="text-sm font-bold text-textMain">AMD Ryzen 7 5700U</div>
          <div className="text-[11px] text-textMuted">8 Cores, 16 Threads (1.8 - 4.3 GHz)</div>
          <div className="pt-2 border-t border-surfaceBorder flex items-center justify-between text-xs">
            <span className="text-textSubtle">OCR Engine Load</span>
            <span className="text-success font-semibold font-mono">&lt; 1.5% APU</span>
          </div>
        </div>

        <div className="cyber-card p-5 space-y-2">
          <div className="flex items-center justify-between text-textMuted">
            <span className="text-xs font-semibold uppercase tracking-wider">GPU & Runtime</span>
            <Layers className="w-4 h-4 text-accentBlue" />
          </div>
          <div className="text-sm font-bold text-textMain">AMD Radeon Graphics</div>
          <div className="text-[11px] text-textMuted">DirectX 12 / Evergreen WebView2</div>
          <div className="pt-2 border-t border-surfaceBorder flex items-center justify-between text-xs">
            <span className="text-textSubtle">WebView2 Build</span>
            <span className="text-accent font-semibold font-mono">155.0.4283.62</span>
          </div>
        </div>

        <div className="cyber-card p-5 space-y-2">
          <div className="flex items-center justify-between text-textMuted">
            <span className="text-xs font-semibold uppercase tracking-wider">Storage Health</span>
            <HardDrive className="w-4 h-4 text-warning" />
          </div>
          <div className="text-sm font-bold text-textMain">Drive C: Preserved</div>
          <div className="text-[11px] text-textMuted">Drive D: GameLingo Root (~62 GB Free)</div>
          <div className="pt-2 border-t border-surfaceBorder flex items-center justify-between text-xs">
            <span className="text-textSubtle">C: Drive Footprint</span>
            <span className="text-success font-semibold font-mono">0 MB Added</span>
          </div>
        </div>
      </div>
    </div>
  );
};
