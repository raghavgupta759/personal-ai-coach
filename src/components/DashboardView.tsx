import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Play,
  FileSearch,
  Mic,
  Award,
  BookOpen,
  Calendar,
  Building2,
  Clock,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { api } from '../api';
import type { User, InterviewSession, AnalysisRecord } from '../types';

interface DashboardViewProps {
  user: User;
  onNavigate: (tab: string, state?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ user, onNavigate }) => {
  const [recentInterviews, setRecentInterviews] = useState<InterviewSession[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Compute greeting based on local time
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const greeting = `Good ${timeOfDay}, ${user.name}`;

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [interviewsRes, analysesRes] = await Promise.all([
          api.listInterviews().catch(() => ({ interviews: [] })),
          api.listAnalyses().catch(() => ({ analyses: [] })),
        ]);
        setRecentInterviews(interviewsRes.interviews || []);
        setRecentAnalyses(analysesRes.analyses || []);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const latestSession = recentInterviews[0];
  const readinessScore = recentInterviews.length > 0 && latestSession?.finalReport
    ? Math.round(latestSession.finalReport.overallScore * 20)
    : 78;

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Welcome Banner with 3D depth & specular border */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900/90 via-slate-900/95 to-indigo-950/60 border border-slate-800/80 border-t-white/[0.14] shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-600/15 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/80 border border-violet-500/40 text-violet-300 text-xs font-semibold shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Target: {user.target_role || 'Senior Full-Stack Engineer'} at {user.target_company || 'Stripe'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              {greeting}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300/90 max-w-xl leading-relaxed">
              Your preparation workspace is primed. Complete your 3 mock tracks and review your 8-dimension rubrics to maximize your interview delivery.
            </p>
          </div>

          {/* 3D Readiness gauge */}
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800/90 border-t-white/10 p-4 sm:p-5 rounded-2xl shrink-0 shadow-lg shadow-black/40 backdrop-blur-md">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-slate-800/80"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-cyan-400"
                  fill="transparent"
                  strokeDasharray={163.3}
                  strokeDashoffset={163.3 - (163.3 * readinessScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-extrabold text-white tracking-tight">{readinessScore}%</span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Practice Readiness</div>
              <div className="text-xs font-semibold text-white mt-0.5">
                {readinessScore >= 85 ? 'Strong Confidence' : 'Active Preparation'}
              </div>
              <div className="text-[10px] text-slate-400/80 mt-1">Based on simulated rubrics</div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Hub - 4 Modules with 3D Hover & Specular Highlights */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Interactive Preparation Modules</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Select any module to start</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Resume Analysis */}
          <button
            onClick={() => onNavigate('analysis')}
            className="text-left glass-panel-3d card-3d-hover rounded-2xl p-5 border border-slate-800/90 border-t-white/[0.12] cursor-pointer flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-violet-600/20 transition-all" />
            <div>
              <div className="w-11 h-11 rounded-xl bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 group-hover:border-violet-400/60 transition-all shadow-md shadow-violet-950/50">
                <FileSearch className="w-5 h-5 text-cyan-300" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">Resume & JD Analysis</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Match verified evidence, detect missing skills, and build your 7-day study plan.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400">
              <span>Inspect Match</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card 2: Mock 1 */}
          <button
            onClick={() => onNavigate('interview', { track: 'hr' })}
            className="text-left glass-panel-3d card-3d-hover rounded-2xl p-5 border border-slate-800/90 border-t-white/[0.12] cursor-pointer flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-indigo-600/20 transition-all" />
            <div>
              <div className="w-11 h-11 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-300 mb-4 group-hover:scale-110 group-hover:border-indigo-400/60 transition-all shadow-md shadow-indigo-950/50">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">Mock 1: HR & Behavioral</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                20-min practice on motivation, STAR conflict stories, and team alignment.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400">
              <span>Start Session</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card 3: Mock 2 */}
          <button
            onClick={() => onNavigate('interview', { track: 'technical' })}
            className="text-left glass-panel-3d card-3d-hover rounded-2xl p-5 border border-cyan-500/30 border-t-cyan-400/30 cursor-pointer flex flex-col justify-between group relative overflow-hidden bg-gradient-to-b from-slate-900/90 to-slate-950/90"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/15 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/25 transition-all" />
            <div>
              <div className="w-11 h-11 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-300 mb-4 group-hover:scale-110 group-hover:border-cyan-400 transition-all shadow-md shadow-cyan-950/50">
                <Play className="w-5 h-5 text-cyan-300" />
              </div>
              <div className="inline-block px-1.5 py-0.5 rounded bg-cyan-950/90 text-cyan-400 text-[9px] font-bold uppercase tracking-wider mb-1 border border-cyan-500/30">
                Popular Track
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">Mock 2: Technical & Design</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Role-specific engineering concepts, database concurrency, and trade-offs.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400">
              <span>Start Session</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card 4: Mock 3 */}
          <button
            onClick={() => onNavigate('interview', { track: 'project_mixed' })}
            className="text-left glass-panel-3d card-3d-hover rounded-2xl p-5 border border-slate-800/90 border-t-white/[0.12] cursor-pointer flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-violet-600/20 transition-all" />
            <div>
              <div className="w-11 h-11 rounded-xl bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-violet-300 mb-4 group-hover:scale-110 group-hover:border-violet-400/60 transition-all shadow-md shadow-violet-950/50">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-violet-300 transition-colors">Mock 3: Project Deep Dive</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Questions targeting the actual projects and architecture on your resume.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-violet-400">
              <span>Start Session</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* 2-Column Section: Recent Sessions + 7-Day Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Interviews / History */}
        <div className="lg:col-span-2 glass-panel-3d rounded-2xl p-6 border border-slate-800/90 border-t-white/[0.12] shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Recent Mock Interviews</span>
            </h2>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer transition-colors"
            >
              View Full History →
            </button>
          </div>

          {recentInterviews.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/50 rounded-xl border border-dashed border-slate-800/90">
              <Mic className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No mock interview sessions completed yet.</p>
              <button
                onClick={() => onNavigate('interview', { track: 'hr' })}
                className="mt-3 btn-3d-primary px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Start First Mock Interview
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentInterviews.slice(0, 3).map((item) => {
                const durationMin = Math.round(item.duration_seconds / 60);
                const score = item.finalReport?.overallScore || 4.2;
                return (
                  <div
                    key={item.id}
                    onClick={() => onNavigate('interview', { sessionId: item.id })}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 border-t-white/[0.06] hover:border-violet-500/50 hover:bg-slate-900/60 transition-all flex items-center justify-between cursor-pointer group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold text-white capitalize group-hover:text-cyan-300 transition-colors">
                          {item.session_type === 'hr' ? 'HR & Behavioral' : item.session_type === 'technical' ? 'Technical Concurrency' : 'Project Deep Dive'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 uppercase font-medium">
                          {item.mode}
                        </span>
                        {item.ended_early ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/50 font-medium">
                            Ended Early ({durationMin}m)
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 font-medium">
                            Completed ({durationMin}m)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 max-w-md">
                        {item.finalReport?.summary || 'Session recorded with category scores and answer rubrics.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-cyan-400">{score}</span>
                        <span className="text-[10px] text-slate-500"> / 5.0</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Tools & Study Pack */}
        <div className="space-y-4">
          {/* Study Pack CTA */}
          <div className="glass-panel-3d card-3d-hover rounded-2xl p-5 border border-violet-500/40 border-t-white/[0.15] bg-gradient-to-br from-violet-950/50 via-slate-900 to-slate-900 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-cyan-300 shadow-inner">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Downloadable Study Pack</h3>
            </div>
            <p className="text-xs text-slate-300/90 mb-4 leading-relaxed">
              Export a complete PDF revision manual with sourced facts, 15+ technical questions, and STAR answer templates.
            </p>
            <button
              onClick={() => onNavigate('studypacks')}
              className="w-full btn-3d-primary py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Open Study Pack Hub →
            </button>
          </div>

          {/* Ask Me Coach CTA */}
          <div className="glass-panel-3d card-3d-hover rounded-2xl p-5 border border-slate-800/90 border-t-white/[0.12] shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Ask Me: AI Coach</h3>
            </div>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Ask questions about your projects, interview answers, or company research anytime.
            </p>
            <button
              onClick={() => onNavigate('coach')}
              className="w-full btn-3d-secondary py-2.5 px-3 rounded-xl text-xs font-medium cursor-pointer"
            >
              Chat With Coach
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
