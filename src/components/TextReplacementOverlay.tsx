import React from 'react';
import { TranslationResult, AppSettings, BoundingBox } from '../types';

interface TextReplacementOverlayProps {
  translation: TranslationResult | null;
  boxes?: BoundingBox[];
  settings: AppSettings['overlay'];
  visible: boolean;
}

export const TextReplacementOverlay: React.FC<TextReplacementOverlayProps> = ({
  translation,
  boxes = [],
  settings,
  visible,
}) => {
  if (!visible || !translation || !translation.translatedText) {
    return null;
  }

  // Fallback to bottom subtitle if no bounding boxes provided
  if (!boxes || boxes.length === 0) {
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 pointer-events-none z-50">
        <div
          className="px-5 py-2.5 rounded-lg border border-accent/30 backdrop-blur-md shadow-xl text-center"
          style={{
            backgroundColor: `rgba(11, 16, 24, ${settings.maskOpacity || 0.9})`,
          }}
        >
          <div
            className="text-textMain font-medium"
            style={{ fontSize: `${settings.fontSize}px` }}
          >
            {translation.translatedText}
          </div>
          <div className="text-[10px] text-accent/80 mt-0.5 font-mono">
            [Mode B Auto-Fallback]
          </div>
        </div>
      </div>
    );
  }

  // Calculate composite bounding box covering the detected lines
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));

  const maskWidth = Math.max(maxX - minX + 24, 200);
  const maskHeight = Math.max(maxY - minY + 16, 40);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div
        className="absolute transition-all duration-200 rounded-md border border-accent/40 shadow-xl flex items-center justify-center p-3 text-center backdrop-blur-sm"
        style={{
          left: `${minX - 12}px`,
          top: `${minY - 8}px`,
          width: `${maskWidth}px`,
          minHeight: `${maskHeight}px`,
          backgroundColor: `rgba(11, 16, 24, ${settings.maskOpacity || 0.92})`,
        }}
      >
        <div
          className="text-textMain font-medium leading-snug select-none"
          style={{
            fontSize: `${Math.max(settings.fontSize - 2, 14)}px`,
            fontFamily: settings.fontFamily || 'Inter, sans-serif',
          }}
        >
          {translation.translatedText}
        </div>
      </div>
    </div>
  );
};
