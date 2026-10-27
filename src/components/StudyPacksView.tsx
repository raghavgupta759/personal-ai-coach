import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Download,
  Sparkles,
  FileText,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  ExternalLink,
  Trash2,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api';
import type { User, StudyPackRecord } from '../types';

interface StudyPacksViewProps {
  user: User;
  initialAnalysisId?: string;
  onNavigate: (tab: string) => void;
}

export const StudyPacksView: React.FC<StudyPacksViewProps> = ({
  user,
  initialAnalysisId,
  onNavigate,
}) => {
  const [studyPacks, setStudyPacks] = useState<StudyPackRecord[]>([]);
  const [selectedPack, setSelectedPack] = useState<StudyPackRecord | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function loadPacks() {
      try {
        const res = await api.listStudyPacks();
        setStudyPacks(res.studyPacks || []);
        if (res.studyPacks && res.studyPacks.length > 0) {
          const first = await api.getStudyPack(res.studyPacks[0].id);
          setSelectedPack(first.studyPack);
        }
      } catch (e) {
        // Safe ignore
      } finally {
        setLoading(false);
      }
    }
    loadPacks();
  }, []);

  const handleGenerateStudyPack = async () => {
    setGenerating(true);
    try {
      const res = await api.createStudyPack(initialAnalysisId);
      const full = await api.getStudyPack(res.studyPackId);
      setSelectedPack(full.studyPack);
      const list = await api.listStudyPacks();
      setStudyPacks(list.studyPacks || []);
    } catch (err: any) {
      alert('Could not generate study pack: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async (pack: StudyPackRecord) => {
    setDownloading(true);
    try {
      await api.downloadStudyPackPdf(pack.id, `${pack.title.replace(/\s+/g, '_')}.pdf`);
    } catch (err: any) {
      alert('Download failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleDeletePack = async (id: string) => {
    if (confirm('Delete this generated study pack?')) {
      try {
        await api.deleteStudyPack(id);
        const remaining = studyPacks.filter((p) => p.id !== id);
        setStudyPacks(remaining);
        if (selectedPack?.id === id) {
          setSelectedPack(remaining[0] || null);
        }
      } catch (e) {
        alert('Could not delete pack');
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Personalized Offline Revision Pack</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Downloadable Interview Study Guide
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Compiled from your verified resume evidence, target JD requirements, sourced company research, 15+ technical question outlines, and STAR behavioral blueprints.
          </p>
        </div>

        <button
          onClick={handleGenerateStudyPack}
          disabled={generating}
          className="px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-600/30 hover:from-violet-500 hover:to-cyan-400 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating ? (
            <span>Generating Study Guide...</span>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>Generate New Study Pack</span>
            </>
          )}
        </button>
      </div>

      {studyPacks.length === 0 && !selectedPack ? (
        <div className="glass-panel-3d p-12 rounded-3xl border border-slate-800/90 border-t-white/[0.12] text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-violet-950/70 border border-violet-500/40 flex items-center justify-center mx-auto text-cyan-400 shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Study Packs Generated Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Run a resume analysis or click the button above to generate a complete personalized PDF study guide for {user.target_company || 'your target company'}.
          </p>
          <button
            onClick={handleGenerateStudyPack}
            disabled={generating}
            className="mt-2 btn-3d-primary px-6 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Generate Study Pack Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Pack Selector */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Your Generated Guides ({studyPacks.length})
            </h3>

            {studyPacks.map((pack) => {
              const isSelected = selectedPack?.id === pack.id;
              return (
                <div
                  key={pack.id}
                  onClick={async () => {
                    const full = await api.getStudyPack(pack.id);
                    setSelectedPack(full.studyPack);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between card-3d-hover ${
                    isSelected
                      ? 'bg-violet-950/50 border-violet-500/60 shadow-lg shadow-violet-950/40 border-t-white/[0.15]'
                      : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white line-clamp-1">{pack.title}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(pack.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPdf(pack);
                      }}
                      className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePack(pack.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete Pack"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Selected Study Pack Preview */}
          {selectedPack && selectedPack.content && (
            <div className="lg:col-span-8 space-y-6">
              <div className="glass-panel-3d p-6 sm:p-8 rounded-3xl border border-violet-500/40 border-t-white/[0.15] bg-gradient-to-r from-slate-900/95 via-indigo-950/60 to-slate-900/95 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    PDF Study Guide Preview
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                    {selectedPack.title}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 font-medium">
                    Candidate: {selectedPack.content.userName} • Generated: {selectedPack.content.generationDate}
                  </p>
                </div>

                <button
                  onClick={() => handleDownloadPdf(selectedPack)}
                  disabled={downloading}
                  className="btn-3d-primary px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shrink-0 relative z-10"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloading ? 'Preparing PDF...' : 'Download Full PDF'}</span>
                </button>
              </div>

              {/* Study Guide Content Sections Preview */}
              <div className="glass-panel-3d p-6 sm:p-8 rounded-3xl border border-slate-800/90 border-t-white/[0.12] space-y-8 shadow-xl">
                {/* Section 1: Company Overview */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                    <span className="w-6 h-6 rounded-lg bg-violet-600/30 text-cyan-300 flex items-center justify-center text-xs font-bold shadow-inner">
                      1
                    </span>
                    <span>Company Overview & Sourced Facts</span>
                  </h3>
                  <p className="text-xs text-slate-300/90 leading-relaxed">
                    {selectedPack.content.companyResearch?.overview}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {selectedPack.content.companyResearch?.sourcedFacts?.slice(0, 2).map((f: any, i: number) => (
                      <div key={i} className="p-3.5 bg-slate-950/80 border border-slate-800/90 rounded-xl text-xs text-slate-300 shadow-sm card-3d-hover">
                        <p className="font-medium">"{f.claim}"</p>
                        <span className="text-[10px] text-cyan-400 mt-1.5 block font-semibold">— {f.sourceTitle}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 2: Requirements Map */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                    <span className="w-6 h-6 rounded-lg bg-violet-600/30 text-cyan-300 flex items-center justify-center text-xs font-bold shadow-inner">
                      2
                    </span>
                    <span>JD Requirements & Resume Strengths / Gaps</span>
                  </h3>
                  <div className="space-y-2">
                    {selectedPack.content.analysis?.requirementsMatch?.slice(0, 4).map((rm: any, i: number) => (
                      <div key={i} className="p-3 bg-slate-950/80 border border-slate-800/90 rounded-xl text-xs flex items-center justify-between shadow-sm">
                        <span className="text-slate-200 font-medium">{rm.requirement}</span>
                        <span className="text-[10px] uppercase font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/50">
                          {rm.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 3: Technical Blueprint */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                    <span className="w-6 h-6 rounded-lg bg-violet-600/30 text-cyan-300 flex items-center justify-center text-xs font-bold shadow-inner">
                      3
                    </span>
                    <span>Key Technical Questions & Answer Outlines</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-950/80 border border-slate-800/90 rounded-xl space-y-1.5 shadow-sm card-3d-hover">
                      <h4 className="text-xs font-bold text-white">
                        Q1: How do you design an idempotent API endpoint for payment processing?
                      </h4>
                      <p className="text-xs text-slate-400 italic">
                        Concepts: Idempotency keys, atomic SETNX in Redis, unique database constraints in PostgreSQL, consistent 200/409 responses.
                      </p>
                    </div>
                    <div className="p-4 bg-slate-950/80 border border-slate-800/90 rounded-xl space-y-1.5 shadow-sm card-3d-hover">
                      <h4 className="text-xs font-bold text-white">
                        Q2: Explain PostgreSQL transaction isolation levels and concurrency control.
                      </h4>
                      <p className="text-xs text-slate-400 italic">
                        Concepts: Read Committed vs Repeatable Read vs Serializable, SELECT FOR UPDATE row locking on payment balance mutations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 4: 7-Day Plan */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                    <span className="w-6 h-6 rounded-lg bg-violet-600/30 text-cyan-300 flex items-center justify-center text-xs font-bold shadow-inner">
                      4
                    </span>
                    <span>7-Day Preparation Schedule</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedPack.content.analysis?.studyPlan?.slice(0, 4).map((sp: any) => (
                      <div key={sp.day} className="p-3 bg-slate-950/80 border border-slate-800/90 rounded-xl shadow-sm">
                        <span className="text-[10px] text-cyan-400 font-bold">Day {sp.day}: {sp.focus}</span>
                        <p className="text-slate-400 mt-1 line-clamp-2">{sp.task}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-800/40 flex items-center justify-between shadow-inner">
                  <span className="text-xs text-slate-300">
                    The downloaded PDF contains full unabridged questions, STAR blueprints, and revision checklists.
                  </span>
                  <button
                    onClick={() => handleDownloadPdf(selectedPack)}
                    disabled={downloading}
                    className="text-xs text-cyan-400 font-bold hover:text-cyan-300 hover:underline shrink-0 cursor-pointer ml-4"
                  >
                    Download PDF →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
