import React from 'react';
import { 
  LayoutDashboard, 
  Crop, 
  Sliders, 
  Languages, 
  BookA, 
  Cpu, 
  History, 
  Activity, 
  Settings,
  Sparkles
} from 'lucide-react';

export type NavTab = 
  | 'dashboard'
  | 'capture'
  | 'overlay'
  | 'translation'
  | 'glossary'
  | 'offline'
  | 'history'
  | 'diagnostics'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCapturing: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, isCapturing }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'capture', label: 'Capture & Window', icon: Crop },
    { id: 'overlay', label: 'Overlay HUD', icon: Sliders },
    { id: 'translation', label: 'Translation Engine', icon: Languages },
    { id: 'glossary', label: 'Wuthering Glossary', icon: BookA },
    { id: 'offline', label: 'Offline Models', icon: Cpu },
    { id: 'history', label: 'Dialogue History', icon: History },
    { id: 'diagnostics', label: 'Diagnostics & APU', icon: Activity },
    { id: 'settings', label: 'General & Hotkeys', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-sidebar border-r border-surfaceBorder flex flex-col justify-between h-screen shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-surfaceBorder flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-accentBlue flex items-center justify-center shadow-glow-accent">
            <Sparkles className="w-5 h-5 text-background" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-wider text-textMain uppercase">GameLingo</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-semibold border border-accent/30">v1.0</span>
            </div>
            <p className="text-[11px] text-textMuted tracking-tight">Play Beyond Language</p>
          </div>
        </div>

        {/* Translation Status Pill */}
        <div className="px-4 py-3 mx-3 my-3 rounded-lg bg-surface/80 border border-surfaceBorder flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isCapturing ? 'bg-success animate-pulse shadow-[0_0_8px_#35C98A]' : 'bg-textSubtle'}`} />
            <span className="text-xs font-medium text-textMain">
              {isCapturing ? 'Translator Active' : 'Standby'}
            </span>
          </div>
          <span className="text-[10px] text-accent font-mono">WW: En → Id</span>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as NavTab)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  active 
                    ? 'bg-accent/15 text-accent border border-accent/40 shadow-sm' 
                    : 'text-textMuted hover:text-textMain hover:bg-surface'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-accent' : 'text-textMuted'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Target Game Badge */}
      <div className="p-4 border-t border-surfaceBorder bg-surface/40">
        <div className="text-[11px] text-textSubtle font-medium uppercase tracking-wider mb-1">Target Profile</div>
        <div className="text-xs font-semibold text-textMain flex items-center justify-between">
          <span>Wuthering Waves</span>
          <span className="text-[10px] text-success bg-success/15 px-1.5 py-0.5 rounded border border-success/30">Detected</span>
        </div>
      </div>
    </aside>
  );
};
