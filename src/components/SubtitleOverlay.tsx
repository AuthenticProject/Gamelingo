import React, { useEffect, useState } from 'react';
import { TranslationResult, AppSettings } from '../types';

interface SubtitleOverlayProps {
  translation: TranslationResult | null;
  settings: AppSettings['overlay'];
  visible: boolean;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  translation,
  settings,
  visible,
}) => {
  const [fading, setFading] = useState(false);
  const [displayContent, setDisplayContent] = useState<TranslationResult | null>(null);

  useEffect(() => {
    if (translation && translation.translatedText) {
      setDisplayContent(translation);
      setFading(false);

      const timer = setTimeout(() => {
        setFading(true);
      }, settings.displayDurationMs || 6000);

      return () => clearTimeout(timer);
    } else {
      setFading(true);
    }
  }, [translation, settings.displayDurationMs]);

  if (!visible || !displayContent || (!displayContent.translatedText && fading)) {
    return null;
  }

  const customStyle: React.CSSProperties = {
    fontSize: `${settings.fontSize}px`,
    fontFamily: settings.fontFamily || 'Inter, sans-serif',
    color: settings.textColor || '#F5F7FA',
    maxWidth: `${settings.maxWidthPercent}%`,
    textShadow: settings.textShadow
      ? '0 0 10px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.9), 0 0 2px #000'
      : 'none',
    WebkitTextStroke: settings.textOutline ? '1px rgba(0,0,0,0.85)' : 'none',
  };

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-end items-center pb-16 z-50 transition-opacity duration-300">
      <div
        className={`transition-all duration-300 transform ${
          fading ? 'opacity-0 scale-98' : 'opacity-100 scale-100'
        }`}
        style={{ maxWidth: `${settings.maxWidthPercent}%` }}
      >
        <div
          className="px-6 py-3.5 rounded-xl border border-accent/20 backdrop-blur-md shadow-2xl flex flex-col items-center text-center"
          style={{
            backgroundColor: `rgba(11, 16, 24, ${settings.backgroundOpacity})`,
          }}
        >
          {/* Main Translated Subtitle */}
          <div
            style={customStyle}
            className="font-medium leading-relaxed tracking-wide select-none"
          >
            {displayContent.translatedText}
          </div>

          {/* Micro HUD Meta (Engine & Latency Indicator) */}
          <div className="mt-1 flex items-center gap-2 text-[10px] text-textMuted/70 font-mono">
            <span className="uppercase text-accent">{displayContent.engineUsed}</span>
            <span>•</span>
            <span>{displayContent.latencyMs}ms</span>
            {displayContent.cached && (
              <>
                <span>•</span>
                <span className="text-success">Cached</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
