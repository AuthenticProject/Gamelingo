import React, { useState } from 'react';
import { 
  Languages, 
  Globe, 
  Key, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  Gauge, 
  Save, 
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { 
  AppSettings, 
  TranslationEngineType, 
  OnlineProvider, 
  PollingSpeed 
} from '../types';

interface TranslationSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
}

export const TranslationSettings: React.FC<TranslationSettingsProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [deeplKey, setDeeplKey] = useState(settings.apiKeys.deepl || '');
  const [openaiKey, setOpenaiKey] = useState(settings.apiKeys.openai || '');
  const [libreUrl, setLibreUrl] = useState(settings.apiKeys.libretranslateUrl || '');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveApiKeys = () => {
    onUpdateSettings({
      apiKeys: {
        deepl: deeplKey.trim(),
        openai: openaiKey.trim(),
        libretranslateUrl: libreUrl.trim(),
      },
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const setEngine = (engine: TranslationEngineType) => {
    if (engine === 'offline') {
      alert('Offline translation engine is currently Not Installed. Please install a model in the Offline Model Manager first.');
      return;
    }
    onUpdateSettings({ engineType: engine });
  };

  const setProvider = (provider: OnlineProvider) => {
    onUpdateSettings({ onlineProvider: provider });
  };

  const setSpeed = (speed: PollingSpeed) => {
    const intervals: Record<PollingSpeed, number> = {
      performance: 1000,
      balanced: 500,
      responsive: 250,
    };
    onUpdateSettings({
      pollingSpeed: speed,
      pollingIntervalMs: intervals[speed],
    });
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-textMain flex items-center gap-2">
          <Languages className="w-4 h-4 text-accent" />
          <span>Translation Engine Configuration</span>
        </h2>
        <p className="text-xs text-textMuted mt-0.5">
          Select between Online Cloud, Smart Hybrid, or view Offline model status.
        </p>
      </div>

      {/* Engine Architecture Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hybrid Engine Card (Recommended) */}
        <div
          onClick={() => setEngine('hybrid')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            settings.engineType === 'hybrid'
              ? 'bg-accent/15 border-accent shadow-glow-accent text-textMain'
              : 'cyber-card text-textMuted hover:border-textSubtle'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-5 h-5 text-accent" />
            <span className="text-[10px] text-accent font-bold bg-accent/20 px-2 py-0.5 rounded">
              Active / Recommended
            </span>
          </div>
          <h3 className="text-sm font-bold text-textMain">Hybrid Intelligence</h3>
          <p className="text-[11px] text-textMuted mt-1">
            Checks in-memory LRU cache first; translates new dialogue lines via secure cloud API.
          </p>
        </div>

        {/* Online Engine Card */}
        <div
          onClick={() => setEngine('online')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            settings.engineType === 'online'
              ? 'bg-accentBlue/15 border-accentBlue shadow-glow-blue text-textMain'
              : 'cyber-card text-textMuted hover:border-textSubtle'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Globe className="w-5 h-5 text-accentBlue" />
            {settings.engineType === 'online' && (
              <span className="text-[10px] text-accentBlue font-bold bg-accentBlue/20 px-2 py-0.5 rounded">
                Active
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-textMain">Online Direct Mode</h3>
          <p className="text-[11px] text-textMuted mt-1">
            Translates directly via Google Translate, DeepL, or OpenAI API endpoints.
          </p>
        </div>

        {/* Offline Engine Card (HONEST STATUS: Not Installed) */}
        <div
          onClick={() => setEngine('offline')}
          className="p-4 rounded-xl border border-surfaceBorder bg-surface/30 opacity-60 cursor-not-allowed text-textMuted"
        >
          <div className="flex items-center justify-between mb-2">
            <HardDrive className="w-5 h-5 text-textSubtle" />
            <span className="text-[10px] text-warning font-semibold bg-warning/10 px-2 py-0.5 rounded border border-warning/20">
              Not Installed
            </span>
          </div>
          <h3 className="text-sm font-bold text-textMuted">Offline Translation</h3>
          <p className="text-[11px] text-textSubtle mt-1">
            Local neural inference is not installed. Use Model Manager to install an offline model package.
          </p>
        </div>
      </div>

      {/* Online Providers Configuration */}
      <div className="cyber-card p-5 space-y-4">
        <h3 className="text-xs font-semibold text-textSubtle uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-4 h-4 text-accent" />
          <span>Active Online Provider Selection</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'google', name: 'Google Translate', desc: 'Default (Fast & Free)' },
            { id: 'deepl', name: 'DeepL API', desc: 'Premium Quality (Key Req.)' },
            { id: 'libretranslate', name: 'LibreTranslate', desc: 'Self-Hosted Endpoint' },
            { id: 'openai', name: 'OpenAI GPT-4o', desc: 'Natural Tone (Key Req.)' },
          ].map((prov) => {
            const isSelected = settings.onlineProvider === prov.id;
            return (
              <button
                key={prov.id}
                onClick={() => setProvider(prov.id as OnlineProvider)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-accent/15 border-accent text-textMain'
                    : 'bg-background border-surfaceBorder text-textMuted hover:border-textSubtle'
                }`}
              >
                <div className="text-xs font-bold text-textMain">{prov.name}</div>
                <div className="text-[10px] text-textMuted mt-0.5">{prov.desc}</div>
              </button>
            );
          })}
        </div>

        {/* API Credentials Input */}
        <div className="pt-2 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-textMuted flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-accent" />
              <span>DeepL API Key (Optional)</span>
            </label>
            <input
              type="password"
              placeholder="e.g. 12345678-abcd-1234-abcd-1234567890ab:fx"
              value={deeplKey}
              onChange={(e) => setDeeplKey(e.target.value)}
              className="w-full bg-background border border-surfaceBorder rounded-lg px-3 py-2 text-xs text-textMain font-mono focus:outline-none focus:border-accent"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-textMuted flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-accent" />
              <span>OpenAI API Key (Optional)</span>
            </label>
            <input
              type="password"
              placeholder="e.g. sk-proj-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="w-full bg-background border border-surfaceBorder rounded-lg px-3 py-2 text-xs text-textMain font-mono focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-textSubtle flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              <span>Credentials stored strictly on your local machine.</span>
            </div>
            <button
              onClick={handleSaveApiKeys}
              className="px-4 py-2 bg-accent text-background rounded-lg text-xs font-semibold hover:bg-accent/90 transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savedNotice ? 'Credentials Saved!' : 'Save Credentials'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* APU Polling Frequency */}
      <div className="cyber-card p-5 space-y-3">
        <h3 className="text-xs font-semibold text-textSubtle uppercase tracking-wider flex items-center gap-2">
          <Gauge className="w-4 h-4 text-accent" />
          <span>Screen Capture Frequency (AMD APU Tuning)</span>
        </h3>
        <p className="text-xs text-textMuted">
          Controls how often the background capture service snips the dialogue box for OCR analysis.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {[
            { id: 'performance', name: 'Performance Mode', interval: '1000 ms', desc: 'Lowest APU overhead' },
            { id: 'balanced', name: 'Balanced Mode', interval: '500 ms', desc: 'Optimal for game dialogue' },
            { id: 'responsive', name: 'Responsive Mode', interval: '250 ms', desc: 'Instant subtitle trigger' },
          ].map((mode) => {
            const isSelected = settings.pollingSpeed === mode.id;
            return (
              <div
                key={mode.id}
                onClick={() => setSpeed(mode.id as PollingSpeed)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-accent/15 border-accent text-textMain shadow-sm'
                    : 'bg-background border-surfaceBorder text-textMuted hover:border-textSubtle'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-textMain">{mode.name}</span>
                  <span className="text-[10px] font-mono text-accent">{mode.interval}</span>
                </div>
                <div className="text-[11px] text-textMuted mt-1">{mode.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
