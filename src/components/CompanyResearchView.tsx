import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { api } from '../api';
import type { User, CompanyResearch } from '../types';

interface CompanyResearchViewProps {
  user: User;
}

export const CompanyResearchView: React.FC<CompanyResearchViewProps> = ({ user }) => {
  const [companyInput, setCompanyInput] = useState(user.target_company || 'Stripe');
  const [roleInput, setRoleInput] = useState(user.target_role || 'Senior Full-Stack Engineer');
  const [researchData, setResearchData] = useState<CompanyResearch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanyData = async (comp: string, r: string) => {
    if (!comp.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCompanyResearch(comp.trim(), r.trim());
      setResearchData(res.research);
    } catch (err: any) {
      setError('Could not fetch company research: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData(companyInput, roleInput);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCompanyData(companyInput, roleInput);
  };

  const quickPicks = ['Stripe', 'Google', 'Amazon', 'Meta', 'Netflix'];

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
          <Building2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Sourced Company Intelligence</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Employer & Interview Research Hub
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
          Search verifiable public knowledge about your target employer. All company facts include source URLs and access dates, strictly distinguishing verified public data from practice questions.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="glass-panel-3d p-6 rounded-2xl border border-slate-800/90 border-t-white/[0.12] space-y-4 shadow-xl">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Company Name</label>
            <input
              type="text"
              required
              value={companyInput}
              onChange={(e) => setCompanyInput(e.target.value)}
              placeholder="e.g. Stripe, Google, Datadog"
              className="input-3d w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Job Role</label>
            <input
              type="text"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              placeholder="e.g. Senior Full-Stack Engineer"
              className="input-3d w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-3d-primary py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Searching...</span>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Research</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Picks */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs">
          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider shrink-0">
            Quick Select:
          </span>
          {quickPicks.map((pick) => (
            <button
              key={pick}
              type="button"
              onClick={() => {
                setCompanyInput(pick);
                fetchCompanyData(pick, roleInput);
              }}
              className="px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-violet-500/50 hover:text-white text-slate-300 text-xs transition-all cursor-pointer shadow-sm active:scale-95"
            >
              {pick}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Research Output View */}
      {researchData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Company Overview Card */}
          <div className="glass-panel-3d p-6 sm:p-8 rounded-3xl border border-violet-500/40 border-t-white/[0.15] bg-gradient-to-r from-slate-900/95 via-indigo-950/60 to-slate-900/95 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Target Company Profile
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                    {researchData.company}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">{researchData.foundedOrHq}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                    Last Researched
                  </span>
                  <span className="text-xs font-mono text-cyan-300 font-semibold">{researchData.researchDate}</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-4xl">
                {researchData.overview}
              </p>

              {/* Core Products Tags */}
              {researchData.coreProducts && researchData.coreProducts.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 mr-2">Core Products:</span>
                  {researchData.coreProducts.map((prod, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 font-medium shadow-sm"
                    >
                      {prod}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sourced Citations & Culture Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Verified Public Citations */}
            <div className="glass-panel-3d p-6 rounded-2xl border border-slate-800/90 border-t-white/[0.12] flex flex-col justify-between shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Verified Public Sourced Citations</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Fact claims paired with authoritative URLs and publication dates.
                </p>

                <div className="space-y-3">
                  {researchData.sourcedFacts.map((fact, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 border-t-white/[0.04] space-y-2 shadow-sm card-3d-hover"
                    >
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        "{fact.claim}"
                      </p>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-850/60">
                        <span className="text-slate-400 truncate max-w-[200px]">
                          {fact.sourceTitle} ({fact.sourceDate})
                        </span>
                        {fact.sourceUrl && (
                          <a
                            href={fact.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-semibold transition-colors"
                          >
                            <span>View Source</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Culture & Tech Highlights */}
            <div className="space-y-6">
              {/* Culture */}
              <div className="glass-panel-3d p-6 rounded-2xl border border-slate-800/90 border-t-white/[0.12] shadow-xl">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_#8b5cf6]" />
                  <span>Culture & Engineering Values</span>
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  {researchData.cultureAndValues.map((val, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-violet-400 font-bold">•</span>
                      <span>{val}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tech Stack */}
              <div className="glass-panel-3d p-6 rounded-2xl border border-slate-800/90 border-t-white/[0.12] shadow-xl">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  <span>Key Technologies Mentioned</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {researchData.techStackHighlights.map((tech, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-violet-950/70 border border-violet-500/40 text-cyan-300 text-xs font-semibold shadow-inner"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Practice Questions tailored to the company (with ethical disclaimer) */}
          <div className="glass-panel-3d p-6 sm:p-7 rounded-2xl border border-slate-800/90 border-t-white/[0.12] shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white">
                Simulated Practice Questions For {researchData.company}
              </h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold uppercase tracking-wider border border-slate-700">
                Educational Simulation
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              {researchData.limitationsNote}
            </p>

            <div className="space-y-3">
              {researchData.practiceQuestions.map((pq, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 border-t-white/[0.04] space-y-1.5 shadow-sm card-3d-hover"
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="px-2 py-0.5 rounded bg-violet-600/30 text-cyan-300 font-bold uppercase tracking-wider border border-violet-500/30">
                      {pq.category.replace('_', ' ')}
                    </span>
                    <span className="text-slate-500 font-medium">Practice Question #{idx + 1}</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white">
                    "{pq.question}"
                  </h4>
                  <p className="text-xs text-slate-400 pt-1">
                    <strong className="text-slate-300">Preparation Focus:</strong> {pq.rationales}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
