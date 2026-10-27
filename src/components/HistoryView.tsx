import React, { useState, useEffect } from 'react';
import {
  History,
  Clock,
  Award,
  ChevronRight,
  Trash2,
  Mic,
  Calendar,
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { api } from '../api';
import type { User, InterviewSession, InterviewTurn } from '../types';

interface HistoryViewProps {
  user: User;
  onNavigate: (tab: string, state?: any) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ user, onNavigate }) => {
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<{
    session: InterviewSession;
    turns: InterviewTurn[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.listInterviews();
        setInterviews(res.interviews || []);
      } catch (e) {
        // Safe ignore
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSelectSession = async (session: InterviewSession) => {
    try {
      const full = await api.getInterview(session.id);
      setSelectedSession(full);
    } catch (e) {
      alert('Could not load session details.');
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (confirm('Delete this interview session and transcript?')) {
      try {
        await api.deleteInterview(id);
        setInterviews((prev) => prev.filter((s) => s.id !== id));
        if (selectedSession?.session.id === id) {
          setSelectedSession(null);
        }
      } catch (e) {
        alert('Could not delete session.');
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span>Progress & Session Archive</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Interview History & Progress Tracking
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
          Review previous mock interview recordings, exact answers, 8-dimension rubric feedback, and performance progress.
        </p>
      </div>

      {interviews.length === 0 ? (
        <div className="glass-panel-3d p-12 rounded-3xl border border-slate-800/90 border-t-white/[0.12] text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-violet-950/70 border border-violet-500/40 flex items-center justify-center mx-auto text-cyan-400 shadow-inner">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Interview History Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Take a mock interview to start tracking your performance metrics and answer improvements.
          </p>
          <button
            onClick={() => onNavigate('interview', { track: 'hr' })}
            className="mt-2 btn-3d-primary px-6 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Start First Mock Interview
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Session List */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Completed & In-Progress Sessions ({interviews.length})
            </h3>

            {interviews.map((item) => {
              const isSelected = selectedSession?.session.id === item.id;
              const durationMin = Math.round(item.duration_seconds / 60);
              const score = item.finalReport?.overallScore || 4.2;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectSession(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between card-3d-hover ${
                    isSelected
                      ? 'bg-violet-950/50 border-violet-500/60 shadow-lg shadow-violet-950/40 border-t-white/[0.15]'
                      : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white capitalize">
                          {item.session_type === 'hr'
                            ? 'HR & Behavioral'
                            : item.session_type === 'technical'
                            ? 'Technical Concurrency'
                            : 'Project Deep Dive'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase font-medium">
                          {item.mode}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-cyan-400">{score}</span>
                      <span className="text-[10px] text-slate-500"> / 5.0</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">
                      Duration: {durationMin} min {item.ended_early ? '(Ended early)' : '(Full session)'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(item.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Transcript View */}
          <div className="lg:col-span-7">
            {selectedSession ? (
              <div className="glass-panel-3d p-6 sm:p-8 rounded-3xl border border-slate-800/90 border-t-white/[0.12] space-y-6 shadow-2xl relative overflow-hidden">
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      Session Transcript & Evaluation
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {new Date(selectedSession.session.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white mt-1 capitalize">
                    {selectedSession.session.session_type === 'hr'
                      ? 'HR & Behavioral Track'
                      : selectedSession.session.session_type === 'technical'
                      ? 'Technical & Architecture Track'
                      : 'Project Deep Dive Track'}
                  </h3>
                  {selectedSession.session.finalReport && (
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      {selectedSession.session.finalReport.summary}
                    </p>
                  )}
                </div>

                {/* Turns List */}
                <div className="space-y-5">
                  {selectedSession.turns.map((turn) => (
                    <div
                      key={turn.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-3 shadow-sm card-3d-hover"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-300">
                          Question #{turn.sequenceNo} ({turn.questionCategory})
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                        "{turn.questionText}"
                      </p>

                      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                          Candidate Answer:
                        </span>
                        <p className="leading-relaxed">{turn.answerText || '[No answer recorded]'}</p>
                      </div>

                      {turn.feedback && (
                        <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Rubric Evaluation
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                            {Object.entries(turn.feedback.scores).slice(0, 4).map(([k, v]) => (
                              <div key={k} className="p-2 rounded-lg bg-slate-900 border border-slate-800/60 text-slate-300">
                                <span className="text-[10px] text-slate-400 block truncate font-medium">{k}</span>
                                <span className="font-bold text-cyan-400">{v.toFixed(1)}/5</span>
                              </div>
                            ))}
                          </div>
                          {turn.feedback.improvedAnswer && (
                            <div className="p-3 rounded-xl bg-violet-950/30 text-xs text-slate-300 italic border border-violet-800/40 shadow-inner">
                              <span className="text-violet-400 font-bold not-italic text-[10px] block mb-0.5">
                                Improved Formulation:
                              </span>
                              "{turn.feedback.improvedAnswer}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-panel-3d p-12 rounded-3xl border border-slate-800/90 text-center text-slate-400 text-xs shadow-xl">
                Select a session on the left to review question-by-question transcripts and feedback.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
