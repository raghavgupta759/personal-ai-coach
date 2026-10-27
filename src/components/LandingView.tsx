import React from 'react';
import {
  Sparkles,
  Shield,
  FileCheck,
  Mic,
  Award,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Lock,
  Layers,
  Cpu,
  TrendingUp,
  BrainCircuit,
  Target,
  FileSpreadsheet,
} from 'lucide-react';

interface LandingViewProps {
  onGetStarted: () => void;
  onDemoLogin: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onGetStarted, onDemoLogin }) => {
  return (
    <div className="relative overflow-hidden pb-12">
      {/* Dynamic 3D lighting atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-violet-600/20 via-indigo-900/10 to-transparent blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-96 right-0 w-[450px] h-[450px] bg-cyan-500/10 blur-[130px] pointer-events-none -z-10" />
      <div className="absolute top-[800px] left-0 w-[400px] h-[400px] bg-violet-600/10 blur-[130px] pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 text-center">
        {/* Floating pill badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-violet-950/70 border border-violet-500/35 text-violet-200 text-xs font-semibold uppercase tracking-widest mb-6 shadow-lg shadow-violet-950/50 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>Evidence-Based Interview Intelligence</span>
        </div>

        {/* Hero Title with 3D gradient text */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
          Interview With Unshakable Confidence.{' '}
          <span className="block mt-1 bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-sm">
            Powered by Verified Truth.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
          Personal AI Coach maps your resume to target employer requirements, conducts structured 20-minute adaptive mock interviews, delivers 8-dimension rubric feedback, and generates tailored PDF study packs.
        </p>

        {/* Primary CTAs with 3D feel */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm btn-3d-primary text-white flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>Start Preparing Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onDemoLogin}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl font-semibold text-sm btn-3d-secondary text-slate-200 hover:text-white flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Explore Live Demo (Raghav)</span>
          </button>
        </div>

        {/* Trust verification pills */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0c1222]/80 border border-white/[0.06] shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">No Hallucinated Qualifications</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0c1222]/80 border border-white/[0.06] shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span className="font-medium">8-Category Rubric Scoring</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0c1222]/80 border border-white/[0.06] shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-violet-400" />
            <span className="font-medium">Sourced Company Research</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0c1222]/80 border border-white/[0.06] shadow-sm">
            <Lock className="w-4 h-4 text-slate-400" />
            <span className="font-medium">100% Private Isolated Workspace</span>
          </div>
        </div>
      </section>

      {/* Feature Pillars with 3D card elevation */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400/90 mb-2 block">
            End-to-End Preparation Engine
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Engineered For Serious Career Breakthroughs
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            Not a generic prompt sandbox — a structured, rigorous platform tailored to top technology companies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Card 1: Resume Evidence Mapping */}
          <div className="glass-panel card-3d-hover rounded-3xl p-7 relative flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-900/60 to-slate-900 border border-violet-500/30 flex items-center justify-center text-cyan-400 mb-6 shadow-md shadow-violet-900/30 group-hover:scale-110 transition-transform duration-300">
                <FileCheck className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2.5">
                Resume & JD Evidence Mapping
              </h3>
              <p className="text-xs leading-relaxed text-slate-400 mb-5">
                Extracts your actual career achievements, compares them against target responsibilities (<span className="text-emerald-400 font-semibold">Matched</span>, <span className="text-amber-400 font-semibold">Partial</span>, <span className="text-rose-400 font-semibold">Missing</span>), and surfaces truthful keywords without inflating your resume.
              </p>
            </div>
            <ul className="text-xs text-slate-300 space-y-2.5 border-t border-white/[0.08] pt-5">
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                <span className="font-medium">Every match cites exact resume evidence</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                <span className="font-medium">Personalized 7-day preparation roadmap</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Three Mock Tracks (Featured center card with 3D glow) */}
          <div className="glass-panel card-3d-hover rounded-3xl p-7 relative flex flex-col justify-between border-violet-500/40 bg-gradient-to-b from-[#141b31]/95 to-[#0b1020]/90 shadow-xl shadow-violet-950/40 group">
            <div className="absolute -top-3 right-6 px-3.5 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-[10px] font-extrabold text-white uppercase tracking-wider shadow-md">
              Core Simulation
            </div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-900/60 to-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-6 shadow-md shadow-indigo-900/30 group-hover:scale-110 transition-transform duration-300">
                <Mic className="w-6 h-6 text-violet-300" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2.5">
                Three Full 20-Min Mock Tracks
              </h3>
              <p className="text-xs leading-relaxed text-slate-400 mb-5">
                Experience complete 20-minute simulated interviews with one question at a time and adaptive follow-ups:
                <br /><strong className="text-slate-200">• Track 1:</strong> HR, STAR Behavioral & Motivation
                <br /><strong className="text-slate-200">• Track 2:</strong> Technical Depth & Concurrency
                <br /><strong className="text-slate-200">• Track 3:</strong> Project Architecture Deep Dive
              </p>
            </div>
            <ul className="text-xs text-slate-300 space-y-2.5 border-t border-white/[0.08] pt-5">
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_#a78bfa]" />
                <span className="font-medium">Adaptive difficulty based on prior answers</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_#a78bfa]" />
                <span className="font-medium">Typed or voice mode with editable transcripts</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Rubric Scorecard & Study Guide */}
          <div className="glass-panel card-3d-hover rounded-3xl p-7 relative flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 shadow-md shadow-emerald-950/30 group-hover:scale-110 transition-transform duration-300">
                <Award className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2.5">
                8-Dimension Rubrics & Study Packs
              </h3>
              <p className="text-xs leading-relaxed text-slate-400 mb-5">
                Every answer receives an immediate rubric breakdown across technical correctness, relevance, STAR structure, clarity, grammar, and project evidence. Download a multi-page PDF revision manual for offline prep.
              </p>
            </div>
            <ul className="text-xs text-slate-300 space-y-2.5 border-t border-white/[0.08] pt-5">
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <span className="font-medium">Separates technical skills from English grammar</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <span className="font-medium">Exportable multi-page PDF study manual</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Ethical AI & Transparency Box */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
        <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] flex items-start gap-4 text-xs text-slate-400 shadow-md">
          <div className="p-2 rounded-xl bg-violet-950/60 border border-violet-500/30 shrink-0">
            <Shield className="w-5 h-5 text-violet-400" />
          </div>
          <div className="space-y-1.5">
            <span className="font-bold text-slate-200 text-sm">Our Ethics & Transparency Guarantee:</span>
            <p className="leading-relaxed">
              Personal AI Coach provides structured practice feedback and educational simulations. It does not guarantee employment outcomes or claim to measure psychological confidence through text. All company facts cite verifiable public sources with research dates.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
