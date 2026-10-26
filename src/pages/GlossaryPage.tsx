import React, { useState } from 'react';
import { 
  BookA, 
  Plus, 
  Trash2, 
  Search, 
  Sparkles, 
  Download, 
  Upload,
  Check
} from 'lucide-react';
import { GlossaryEntry } from '../types';
import { GlossaryService } from '../services/glossaryService';

export const GlossaryPage: React.FC = () => {
  const glossaryService = GlossaryService.getInstance();
  const [entries, setEntries] = useState<GlossaryEntry[]>(glossaryService.getAllEntries());
  const [searchQuery, setSearchQuery] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newCategory, setNewCategory] = useState<GlossaryEntry['category']>('lore');
  const [isCaseSensitive, setIsCaseSensitive] = useState(true);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.trim() || !newTarget.trim()) return;

    const added = glossaryService.addEntry({
      source: newSource.trim(),
      target: newTarget.trim(),
      category: newCategory,
      caseSensitive: isCaseSensitive,
      notes: 'User defined rule',
    });

    setEntries(glossaryService.getAllEntries());
    setNewSource('');
    setNewTarget('');
  };

  const handleRemove = (id: string) => {
    glossaryService.removeEntry(id);
    setEntries(glossaryService.getAllEntries());
  };

  const filtered = entries.filter(
    (item) =>
      item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-textMain flex items-center gap-2">
            <BookA className="w-4 h-4 text-accent" />
            <span>Wuthering Waves Terminology Glossary</span>
          </h2>
          <p className="text-xs text-textMuted mt-0.5">
            Preserves names, echoes, attributes, and lore terminology from being distorted by translation engines.
          </p>
        </div>

        <div className="text-xs text-accent font-mono bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20">
          {entries.length} Protected Terms
        </div>
      </div>

      {/* Add New Term Card */}
      <form onSubmit={handleAdd} className="glass-panel p-4 rounded-xl border border-surfaceBorder space-y-3">
        <h3 className="text-xs font-semibold text-textSubtle uppercase tracking-wider flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-accent" />
          <span>Add Protected Term / Glossary Override</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="English Source (e.g. Sanhua)"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            className="bg-background border border-surfaceBorder rounded-lg px-3 py-2 text-xs text-textMain focus:outline-none focus:border-accent"
          />

          <input
            type="text"
            placeholder="Indonesian Target (e.g. Sanhua)"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            className="bg-background border border-surfaceBorder rounded-lg px-3 py-2 text-xs text-textMain focus:outline-none focus:border-accent"
          />

          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as GlossaryEntry['category'])}
            className="bg-background border border-surfaceBorder rounded-lg px-3 py-2 text-xs text-textMain focus:outline-none focus:border-accent"
          >
            <option value="character">Character / NPC</option>
            <option value="lore">Lore / Faction</option>
            <option value="location">Location / Region</option>
            <option value="system">Game System / Echo</option>
            <option value="item">Item / Currency</option>
          </select>

          <button
            type="submit"
            className="bg-accent text-background rounded-lg px-4 py-2 text-xs font-semibold hover:bg-accent/90 transition-all flex items-center justify-center gap-1.5 shadow-glow-accent"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Term</span>
          </button>
        </div>
      </form>

      {/* Glossary Search & List Table */}
      <div className="cyber-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-textSubtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search glossary terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-surfaceBorder rounded-lg pl-9 pr-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-accent"
            />
          </div>
          <span className="text-[11px] text-textMuted">Showing {filtered.length} of {entries.length}</span>
        </div>

        {/* Table */}
        <div className="border border-surfaceBorder rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-background/80 text-textSubtle border-b border-surfaceBorder uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Source (English)</th>
                <th className="py-2.5 px-4 font-semibold">Target (Indonesian)</th>
                <th className="py-2.5 px-4 font-semibold">Category</th>
                <th className="py-2.5 px-4 font-semibold">Notes</th>
                <th className="py-2.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surfaceBorder">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-surface/60 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-textMain">{item.source}</td>
                  <td className="py-2.5 px-4 text-accent font-semibold">{item.target}</td>
                  <td className="py-2.5 px-4">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-surfaceBorder text-textMuted capitalize">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-textSubtle text-[11px]">{item.notes || '-'}</td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-1 rounded text-textSubtle hover:text-danger transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
