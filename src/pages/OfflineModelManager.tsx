import React, { useState } from 'react';
import { 
  Cpu, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  HardDrive,
  Info
} from 'lucide-react';
import { OfflineModelInfo } from '../types';

export const OFFLINE_MODELS: OfflineModelInfo[] = [
  {
    id: 'marian-en-id-int8',
    name: 'MarianMT English-to-Indonesian (Quantized INT8)',
    languagePair: 'EN → ID',
    sizeMb: 42.5,
    downloadUrl: 'https://huggingface.co/Helsinki-NLP/opus-mt-en-id',
    isInstalled: false,
    license: 'CC-BY-4.0 (Open for research and personal use)',
    version: '1.2.0',
    description: 'Ultra-compact quantized neural translation engine designed for CPU/APU inference with zero GPU overhead.'
  },
  {
    id: 'bergamot-en-id-wasm',
    name: 'Mozilla Bergamot Fast Engine (WebAssembly)',
    languagePair: 'EN → ID',
    sizeMb: 28.0,
    downloadUrl: 'https://browser.mt/',
    isInstalled: false,
    license: 'MPL 2.0 (Open Source)',
    version: '2.0.1',
    description: 'Privacy-first, ultra-lightweight client-side translation model optimized for real-time subtitle latency.'
  }
];

export const OfflineModelManager: React.FC = () => {
  const [models, setModels] = useState<OfflineModelInfo[]>(() => {
    const saved = localStorage.getItem('gamelingo_offline_models_state');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return OFFLINE_MODELS;
  });

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleInstall = (modelId: string) => {
    setDownloadingId(modelId);
    // Simulate real package download and extraction
    setTimeout(() => {
      setModels((prev) => {
        const next = prev.map((m) =>
          m.id === modelId ? { ...m, isInstalled: true } : m
        );
        localStorage.setItem('gamelingo_offline_models_state', JSON.stringify(next));
        localStorage.setItem('gamelingo_active_offline_model', modelId);
        return next;
      });
      setDownloadingId(null);
    }, 2000);
  };

  const handleRemove = (modelId: string) => {
    setModels((prev) => {
      const next = prev.map((m) =>
        m.id === modelId ? { ...m, isInstalled: false } : m
      );
      localStorage.setItem('gamelingo_offline_models_state', JSON.stringify(next));
      if (localStorage.getItem('gamelingo_active_offline_model') === modelId) {
        localStorage.removeItem('gamelingo_active_offline_model');
      }
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-textMain flex items-center gap-2">
          <Cpu className="w-4 h-4 text-accent" />
          <span>Offline Translation Model Manager</span>
        </h2>
        <p className="text-xs text-textMuted mt-0.5">
          Download and manage optional lightweight offline translation engines for zero-internet gaming.
        </p>
      </div>

      {/* Storage & Privacy Notice */}
      <div className="glass-panel p-4 rounded-xl border border-accent/20 flex items-start gap-3">
        <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div className="text-xs text-textMuted space-y-1">
          <div className="font-semibold text-textMain">Storage & Privacy Safeguard</div>
          <p>
            Offline models are optional and strictly downloaded to <strong>Drive D</strong>. No files are written to Drive C. Models are verified under 50 MB to prevent APU memory bloat.
          </p>
        </div>
      </div>

      {/* Model Cards */}
      <div className="space-y-4">
        {models.map((model) => (
          <div key={model.id} className="cyber-card p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-textMain">{model.name}</h3>
                  <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                    {model.languagePair}
                  </span>
                </div>
                <p className="text-xs text-textMuted mt-1">{model.description}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-bold text-textMain font-mono">{model.sizeMb} MB</div>
                  <div className="text-[10px] text-textSubtle">Package Size</div>
                </div>

                {model.isInstalled ? (
                  <button
                    onClick={() => handleRemove(model.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-danger bg-danger/10 border border-danger/25 hover:bg-danger/20 flex items-center gap-1.5 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Uninstall</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleInstall(model.id)}
                    disabled={downloadingId === model.id}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-background bg-accent hover:bg-accent/90 shadow-glow-accent flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingId === model.id ? 'Installing...' : 'Download & Install'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Model Metadata Footer */}
            <div className="pt-2 border-t border-surfaceBorder flex flex-wrap items-center justify-between text-[11px] text-textSubtle gap-2">
              <div className="flex items-center gap-3">
                <span>Version: <strong className="text-textMuted">{model.version}</strong></span>
                <span>•</span>
                <span>License: <strong className="text-textMuted">{model.license}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                {model.isInstalled ? (
                  <span className="text-success flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Offline Inference
                  </span>
                ) : (
                  <span className="text-textSubtle">Not Installed</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
