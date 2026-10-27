import React from 'react';
import { TranslationResult, AppSettings, TextBlock, BoundingBox } from '../types';

interface TextReplacementOverlayProps {
  translation: TranslationResult | null;
  blocks?: TextBlock[];
  boxes?: BoundingBox[];
  settings: AppSettings['overlay'];
  visible: boolean;
}

export const TextReplacementOverlay: React.FC<TextReplacementOverlayProps> = ({
  translation,
  blocks = [],
  boxes = [],
  settings,
  visible,
}) => {
  if (!visible || !translation) {
    return null;
  }

  const activeBlocks: TextBlock[] = (translation.blocks && translation.blocks.length > 0)
    ? translation.blocks
    : blocks;

  // Multi-block visual replacement mode
  if (activeBlocks && activeBlocks.length > 0) {
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {activeBlocks.map((b) => {
          const padX = 6;
          const padY = 3;
          const left = Math.max(0, b.box.x - padX);
          const top = Math.max(0, b.box.y - padY);
          const width = Math.max(60, b.box.width + padX * 2);
          const minHeight = Math.max(22, b.box.height + padY * 2);

          const isDialogue = b.category === 'dialogue';
          const fontSize = isDialogue
            ? Math.max(settings.fontSize || 18, 16)
            : minHeight >= 50
              ? 15
              : 12;

          return (
            <div
              key={b.id}
              className={`absolute transition-all duration-150 rounded border shadow-lg flex items-center justify-start p-1.5 backdrop-blur-sm select-none ${
                isDialogue
                  ? 'border-accent bg-[#0B1018]/95'
                  : 'border-accent/40 bg-[#0B1018]/90'
              }`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                minHeight: `${minHeight}px`,
              }}
            >
              <span
                className="text-textMain font-medium leading-snug tracking-normal"
                style={{
                  fontSize: `${fontSize}px`,
                  fontFamily: settings.fontFamily || 'Segoe UI, sans-serif',
                }}
              >
                {b.translatedText || b.text}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Single box / Legacy fallback
  if (!translation.translatedText) return null;

  if (!boxes || boxes.length === 0) {
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 pointer-events-none z-50">
        <div
          className="px-5 py-2.5 rounded-lg border border-accent/40 backdrop-blur-md shadow-xl text-center"
          style={{
            backgroundColor: `rgba(11, 16, 24, ${settings.maskOpacity || 0.92})`,
          }}
        >
          <div
            className="text-textMain font-medium"
            style={{ fontSize: `${settings.fontSize}px` }}
          >
            {translation.translatedText}
          </div>
          <div className="text-[10px] text-accent/80 mt-0.5 font-mono">
            [Visual Replacement Auto-Anchor]
          </div>
        </div>
      </div>
    );
  }

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
