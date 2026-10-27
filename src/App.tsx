/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './components/DashboardView';
import { AnalysisView } from './components/AnalysisView';
import { InterviewView } from './components/InterviewView';
import { CoachView } from './components/CoachView';
import { CompanyResearchView } from './components/CompanyResearchView';
import { StudyPacksView } from './components/StudyPacksView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { api, getStoredToken } from './api';
import type { User } from './types';
import { Sparkles, Shield, Heart } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [navigationState, setNavigationState] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);

  // Check existing session on boot
  useEffect(() => {
    async function checkAuth() {
      const token = getStoredToken();
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          setActiveTab('dashboard');
        } catch (e) {
          // Token expired or invalid
          setUser(null);
          setActiveTab('landing');
        }
      } else {
        setActiveTab('landing');
      }
      setInitializing(false);
    }
    checkAuth();
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setActiveTab('dashboard');
    setAuthModalOpen(false);
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setActiveTab('landing');
  };

  const handleNavigate = (tab: string, state?: any) => {
    setNavigationState(state || null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-0.5 animate-pulse">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Loading Personal AI Coach...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1020] text-[#F4F7FB] flex flex-col selection:bg-violet-600 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        user={user}
        activeTab={activeTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {!user ? (
          <LandingView
            onGetStarted={() => handleOpenAuth('register')}
            onDemoLogin={() => handleOpenAuth('login')}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                user={user}
                onNavigate={(tab, state) => handleNavigate(tab, state)}
              />
            )}

            {activeTab === 'analysis' && (
              <AnalysisView
                user={user}
                onStartInterview={(track, analysisId) =>
                  handleNavigate('interview', { track, analysisId })
                }
                onOpenStudyPack={(analysisId) =>
                  handleNavigate('studypacks', { analysisId })
                }
              />
            )}

            {activeTab === 'interview' && (
              <InterviewView
                user={user}
                initialTrack={navigationState?.track || 'technical'}
                initialSessionId={navigationState?.sessionId}
                onNavigate={(tab) => handleNavigate(tab)}
              />
            )}

            {activeTab === 'coach' && <CoachView user={user} />}

            {activeTab === 'company' && <CompanyResearchView user={user} />}

            {activeTab === 'studypacks' && (
              <StudyPacksView
                user={user}
                initialAnalysisId={navigationState?.analysisId}
                onNavigate={(tab) => handleNavigate(tab)}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                user={user}
                onNavigate={(tab, state) => handleNavigate(tab, state)}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                user={user}
                onUpdateUser={(updated) => setUser(updated)}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </main>

      {/* Auth Dialog Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/70 py-8 mt-16 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">Personal AI Coach</span>
            <span>•</span>
            <span>Grounded Interview Preparation Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Zero Hallucinated Metrics</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">8-Dimension Rubrics</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
