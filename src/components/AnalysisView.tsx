import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Edit3,
  Save,
  Play,
  BookOpen,
  Calendar,
  Layers,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api';
import type { User, AnalysisData } from '../types';

interface AnalysisViewProps {
  user: User;
  onStartInterview: (track: 'hr' | 'technical' | 'project_mixed', analysisId?: string) => void;
  onOpenStudyPack: (analysisId?: string) => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  user,
  onStartInterview,
  onOpenStudyPack,
}) => {
  const [resumeDocId, setResumeDocId] = useState<string | null>(null);
  const [jdDocId, setJdDocId] = useState<string | null>(null);

  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [isEditingJd, setIsEditingJd] = useState(false);

  const [targetCompany, setTargetCompany] = useState(user.target_company || 'Stripe');
  const [targetRole, setTargetRole] = useState(user.target_role || 'Senior Full-Stack Engineer');

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisData | null>(null);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load existing analysis if available
  useEffect(() => {
    async function fetchLatest() {
      try {
        const list = await api.listAnalyses();
        if (list.analyses && list.analyses.length > 0) {
          const latestId = list.analyses[0].id;
          const full = await api.getAnalysis(latestId);
          if (full.analysis?.result) {
            setAnalysisResult(full.analysis.result);
            setActiveAnalysisId(full.analysis.id);
            setTargetCompany(full.analysis.targetCompany || targetCompany);
            setTargetRole(full.analysis.targetRole || targetRole);
          }
        }
      } catch (e) {
        // Safe ignore
      }
    }
    fetchLatest();
  }, []);

  const handleResumeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const res = await api.uploadResume({ file });
      setResumeDocId(res.documentId);
      setResumeText(res.extractedText);
    } catch (err: any) {
      setError('Resume upload failed: ' + err.message);
    }
  };

  const handleJdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const res = await api.uploadJd({ file });
      setJdDocId(res.documentId);
      setJdText(res.extractedText);
    } catch (err: any) {
      setError('Job description upload failed: ' + err.message);
    }
  };

  const handleRunAnalysis = async () => {
    setError(null);
    let rId = resumeDocId;
    let jId = jdDocId;

    try {
      setAnalyzing(true);
      setAnalysisStep(1);

      // If text exists without docId, upload as text first
      if (!rId) {
        if (!resumeText.trim()) throw new Error('Please upload or paste your resume text.');
        const rRes = await api.uploadResume({ text: resumeText });
        rId = rRes.documentId;
        setResumeDocId(rId);
      }
      setAnalysisStep(2);

      if (!jId) {
        if (!jdText.trim()) throw new Error('Please upload or paste the job description.');
        const jRes = await api.uploadJd({ text: jdText });
        jId = jRes.documentId;
        setJdDocId(jId);
      }
      setAnalysisStep(3);

      const res = await api.runAnalysis({
        resumeDocumentId: rId,
        jdDocumentId: jId,
        targetRole,
        targetCompany,
      });

      setAnalysisStep(4);
      setTimeout(() => {
        setAnalysisResult(res.result);
        setActiveAnalysisId(res.analysisId);
        setAnalyzing(false);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please check inputs.');
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
          <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Evidence-Based Analysis Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Resume & Job Description Intelligence
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
          Upload documents or paste text to map verified experience against employer requirements. All analysis is grounded strictly in evidence with zero fabricated credentials.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Target Role & Company Selector */}
      <div className="glass-panel-3d p-6 rounded-2xl border border-slate-800/90 border-t-white/[0.12] grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-xl">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Company</label>
          <input
            type="text"
            value={targetCompany}
            onChange={(e) => setTargetCompany(e.target.value)}
            placeholder="e.g. Stripe, Google, Amazon"
            className="input-3d w-full px-3.5 py-2.5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Job Role</label>
          <input
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Full-Stack Engineer"
            className="input-3d w-full px-3.5 py-2.5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 2-Card Ingestion Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Resume */}
        <div className="glass-panel-3d rounded-2xl p-6 border border-slate-800/90 border-t-white/[0.12] flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">1. Candidate Resume</h3>
                  <span className="text-[10px] text-slate-400">PDF, DOCX, or paste text</span>
                </div>
              </div>
              {resumeText && (
                <button
                  type="button"
                  onClick={() => setIsEditingResume(!isEditingResume)}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingResume ? 'Done Editing' : 'Edit Text'}</span>
                </button>
              )}
            </div>

            {/* Dropzone / Upload area */}
            {!resumeText ? (
              <div className="relative border-2 border-dashed border-slate-800/90 hover:border-violet-500/60 rounded-xl p-8 text-center transition-all bg-slate-950/40 group">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleResumeFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-12 h-12 rounded-2xl bg-violet-950/60 border border-violet-500/30 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6 text-violet-400" />
                </div>
                <p className="text-xs font-semibold text-slate-200">
                  Drop your resume here or <span className="text-cyan-400 underline decoration-cyan-400/30">browse file</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-1">PDF, DOCX up to 10MB</p>
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setResumeText('Raghav Gupta\nSenior Full-Stack Engineer\n6+ years experience with TypeScript, React 18, Node.js, PostgreSQL, Redis, and Webhook idempotency handling 4,000+ RPS.')}
                    className="text-[11px] text-violet-400 hover:text-violet-300 hover:underline cursor-pointer"
                  >
                    Or paste text manually →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Extracted Text ({resumeText.length} characters)</span>
                  <span className="text-emerald-400 font-semibold">Ready for comparison</span>
                </div>
                {isEditingResume ? (
                  <textarea
                    rows={8}
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="input-3d w-full p-3 rounded-xl text-xs text-slate-300 font-mono focus:outline-none"
                  />
                ) : (
                  <div className="max-h-48 overflow-y-auto p-3.5 bg-slate-950/80 border border-slate-800/90 rounded-xl text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                    {resumeText}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setResumeText(''); setResumeDocId(null); }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline mt-1 cursor-pointer"
                >
                  Clear and upload different resume
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Job Description */}
        <div className="glass-panel-3d rounded-2xl p-6 border border-slate-800/90 border-t-white/[0.12] flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-600/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">2. Job Description</h3>
                  <span className="text-[10px] text-slate-400">Paste job post or upload document</span>
                </div>
              </div>
              {jdText && (
                <button
                  type="button"
                  onClick={() => setIsEditingJd(!isEditingJd)}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingJd ? 'Done Editing' : 'Edit Text'}</span>
                </button>
              )}
            </div>

            {!jdText ? (
              <div className="space-y-3">
                <textarea
                  rows={6}
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the target job description here (e.g. qualifications, core responsibilities, tech stack)..."
                  className="input-3d w-full p-3.5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <div className="relative flex items-center justify-center border-t border-slate-800/80 pt-3">
                  <label className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer flex items-center gap-1.5 font-medium">
                    <Upload className="w-3 h-3" />
                    <span>Or upload JD file (.pdf / .docx)</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleJdFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Job Description Text ({jdText.length} characters)</span>
                  <span className="text-cyan-400 font-semibold">Ready</span>
                </div>
                {isEditingJd ? (
                  <textarea
                    rows={8}
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    className="input-3d w-full p-3 rounded-xl text-xs text-slate-300 font-mono focus:outline-none"
                  />
                ) : (
                  <div className="max-h-48 overflow-y-auto p-3.5 bg-slate-950/80 border border-slate-800/90 rounded-xl text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                    {jdText}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setJdText(''); setJdDocId(null); }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline mt-1 cursor-pointer"
                >
                  Clear job description
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action / Progress Trigger */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl glass-panel-3d border border-slate-800/90 border-t-white/[0.12] shadow-xl">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Run Full AI Comparison</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Compares verified evidence against qualifications and produces a 7-day preparation schedule.
          </p>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={analyzing || (!resumeText && !resumeDocId) || (!jdText && !jdDocId)}
          className="w-full sm:w-auto btn-3d-primary px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {analyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Analyzing Documents (Stage {analysisStep}/4)...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
              <span>Run Evidence Analysis</span>
            </>
          )}
        </button>
      </div>

      {/* Analysis Results View */}
      {analysisResult && (
        <div className="space-y-8 animate-fadeIn pt-4">
          {/* Top Result Banner */}
          <div className="glass-panel-3d p-6 sm:p-8 rounded-3xl border border-violet-500/40 border-t-white/[0.15] bg-gradient-to-r from-slate-900/95 via-indigo-950/60 to-slate-900/95 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Analysis Completed</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs text-slate-300 font-semibold">{targetCompany} — {targetRole}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Truthful Match Score: <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">{analysisResult.overallMatchScore}%</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-300/90 mt-2 max-w-2xl leading-relaxed">
                  {analysisResult.profileSummary}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <button
                  onClick={() => onStartInterview('technical', activeAnalysisId || undefined)}
                  className="btn-3d-primary px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" /> Start Mock Interview
                </button>
                <button
                  onClick={() => onOpenStudyPack(activeAnalysisId || undefined)}
                  className="btn-3d-secondary px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-cyan-400" /> Export PDF Study Pack
                </button>
              </div>
            </div>
          </div>

          {/* Requirements Match Table */}
          <div className="glass-panel-3d rounded-2xl p-6 border border-slate-800/90 border-t-white/[0.12] shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-white">Requirement vs. Resume Evidence Map</h3>
                <p className="text-xs text-slate-400">Every match is supported by verified resume quotations</p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                </span>
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> Partial
                </span>
                <span className="flex items-center gap-1 text-rose-400 font-medium">
                  <XCircle className="w-3.5 h-3.5" /> Missing
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {analysisResult.requirementsMatch.map((rm, idx) => {
                const isMatched = rm.status === 'matched';
                const isPartial = rm.status === 'partial';
                const isMissing = rm.status === 'missing';

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 border-t-white/[0.05] hover:border-slate-700 transition-all shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-white">
                        {rm.requirement}
                      </span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 w-fit ${
                          isMatched
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-[0_0_8px_rgba(52,211,153,0.15)]'
                            : isPartial
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                            : isMissing
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {rm.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-start gap-2 bg-slate-900/40 p-2 rounded-lg border border-slate-800/50">
                      <span className="text-slate-500 font-semibold shrink-0">Resume Quote:</span>
                      <span className="italic text-slate-300">{rm.evidence}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths & Gaps (2 columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="glass-panel-3d rounded-2xl p-6 border border-slate-800/90 border-t-white/[0.12] shadow-xl">
              <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Core Verified Strengths
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                {analysisResult.strengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Gaps */}
            <div className="glass-panel-3d rounded-2xl p-6 border border-slate-800/90 border-t-white/[0.12] shadow-xl">
              <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Evidence Gaps To Address
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                {analysisResult.gaps.map((gap, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Truthful Keywords & Likely Topics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel-3d rounded-2xl p-6 border border-slate-800/90 border-t-white/[0.12] shadow-xl">
              <h3 className="text-sm font-bold text-white mb-2">Truthful Keywords To Highlight</h3>
              <p className="text-[11px] text-slate-400 mb-3">
                Terms backed by your actual experience that directly strengthen role alignment:
              </p>
              <div className="flex flex-wrap gap-2">
                {analysisResult.truthfulKeywordSuggestions.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-violet-950/70 border border-violet-500/40 text-cyan-300 text-xs font-semibold shadow-inner"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="glass-panel-3d rounded-2xl p-6 border border-slate-800/90 border-t-white/[0.12] shadow-xl">
              <h3 className="text-sm font-bold text-white mb-2">High-Probability Interview Topics</h3>
              <p className="text-[11px] text-slate-400 mb-3">
                Expected questions derived from target job responsibilities:
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                {analysisResult.likelyTopics.map((top, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">Q{i + 1}.</span>
                    <span>{top}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 7-Day Personalized Roadmap */}
          <div className="glass-panel-3d rounded-2xl p-6 border border-slate-800/90 border-t-white/[0.12] shadow-xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-400" />
              <span>Personalized 7-Day Interview Preparation Roadmap</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Structured daily milestones targeted directly at closing your identified gaps before interview day.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {analysisResult.studyPlan.map((sp) => (
                <div
                  key={sp.day}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 border-t-white/[0.08] flex flex-col justify-between shadow-sm card-3d-hover"
                >
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-600/30 text-cyan-400 border border-violet-500/30">
                      Day {sp.day}
                    </span>
                    <h4 className="text-xs font-bold text-white mt-2 mb-1 line-clamp-1">{sp.focus}</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">{sp.task}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
