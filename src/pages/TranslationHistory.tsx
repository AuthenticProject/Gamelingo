import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Download, 
  Trash2, 
  Clock, 
  Sparkles, 
  Layers 
} from 'lucide-react';
import { TranslationCacheService, CacheItem } from '../services/cacheService';

export const TranslationHistoryPage: React.FC = () => {
  const cacheService = TranslationCacheService.getInstance();
  const [items, setItems] = useState<CacheItem[]>(cacheService.getAllEntries());
  const [searchQuery, setSearchQuery] = useState('');

  const handleClear = () => {
    cacheService.clear();
    setItems([]);
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `gamelingo_dialogue_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filtered = items.filter(
    (item) =>
      item.original.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-textMain flex items-center gap-2">
            <History className="w-4 h-4 text-accent" />
            <span>Dialogue & Translation History</span>
          </h2>
          <p className="text-xs text-textMuted mt-0.5">
            Log of recent in-game conversations translated during gameplay sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-textMain bg-surface border border-surfaceBorder hover:border-accent/40 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-danger bg-danger/10 border border-danger/25 hover:bg-danger/20 flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Search and Table */}
      <div className="cyber-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-textSubtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dialogues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-surfaceBorder rounded-lg pl-9 pr-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-accent"
            />
          </div>
          <span className="text-[11px] text-textMuted">
            {filtered.length} entries recorded
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-textSubtle text-xs">
            No dialogue history recorded yet. Translated conversations will appear here automatically.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-background/80 border border-surfaceBorder hover:border-accent/30 transition-all space-y-2"
              >
                <div className="flex items-center justify-between text-[10px] text-textSubtle font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-accent uppercase font-bold">{item.engine}</span>
                    <span>•</span>
                    <span>Hit Count: {item.hitCount}</span>
                  </div>
                  <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>

                <div className="text-xs text-textMuted">
                  <span className="text-textSubtle mr-2 font-mono">[EN]</span>
                  {item.original}
                </div>

                <div className="text-xs text-textMain font-medium">
                  <span className="text-accent mr-2 font-mono">[ID]</span>
                  {item.translation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
