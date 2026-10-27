import React from 'react';
import {
  Sparkles,
  LayoutDashboard,
  FileSearch,
  Mic,
  MessageSquare,
  Building2,
  BookOpen,
  History,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import type { User } from '../types';

interface NavbarProps {
  user: User | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onOpenAuth,
  onLogout,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analysis', label: 'Resume & JD', icon: FileSearch },
    { id: 'interview', label: 'Mock Interview', icon: Mic },
    { id: 'coach', label: 'Ask Me', icon: MessageSquare },
    { id: 'company', label: 'Company Research', icon: Building2 },
    { id: 'studypacks', label: 'Study Packs', icon: BookOpen },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#060913]/85 backdrop-blur-xl shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand with 3D embossed icon */}
          <button
            onClick={() => onSelectTab(user ? 'dashboard' : 'landing')}
            className="flex items-center gap-3.5 group text-left cursor-pointer transition-transform active:scale-[0.98]"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-600 to-cyan-400 p-[1.5px] shadow-lg shadow-violet-600/30 group-hover:shadow-violet-500/50 transition-all duration-300">
              <div className="w-full h-full bg-[#0c1222] rounded-[10px] flex items-center justify-center border-t border-white/20">
                <Sparkles className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Personal AI Coach
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-violet-950/80 text-violet-300 border border-violet-500/30">
                  v1.0
                </span>
              </div>
              <span className="hidden sm:block text-[10px] font-semibold text-cyan-400/90 tracking-widest uppercase">
                AI Interview Intelligence Platform
              </span>
            </div>
          </button>

          {/* Navigation links (when logged in) with 3D pill depth */}
          {user && (
            <nav className="hidden lg:flex items-center gap-1.5 bg-[#0b1020]/80 p-1.5 rounded-2xl border border-white/[0.07] shadow-inner">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-600/30 via-indigo-600/20 to-cyan-500/20 text-cyan-300 border border-violet-500/40 shadow-sm shadow-violet-600/20 -translate-y-0.5'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Action / Profile */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => onSelectTab('settings')}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'border-violet-500/50 bg-violet-600/25 text-white shadow-sm shadow-violet-500/20'
                      : 'border-white/[0.08] bg-[#0f172a]/60 text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                  title="Profile and Settings"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 p-0.5 shadow-sm">
                    <div className="w-full h-full bg-[#0c1222] rounded-[6px] flex items-center justify-center text-[11px] font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-semibold text-slate-200 max-w-[110px] truncate leading-tight">
                      {user.name}
                    </div>
                    {user.target_company && (
                      <div className="text-[10px] text-cyan-400 font-medium leading-tight truncate max-w-[110px]">
                        {user.target_company}
                      </div>
                    )}
                  </div>
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors border border-transparent hover:border-rose-900/40 cursor-pointer"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-1.5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="btn-3d-primary text-xs font-bold px-4 py-2 rounded-xl text-white cursor-pointer"
                >
                  Get Started Free
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        {user && (
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto py-2.5 border-t border-white/[0.06] scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-violet-600/25 text-cyan-300 border border-violet-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
