import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Square,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Clock,
  Send,
  Edit3,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { api } from '../api';
import type { User, InterviewSession, InterviewTurn, FeedbackData, FinalReport } from '../types';

interface InterviewViewProps {
  user: User;
  initialTrack?: 'hr' | 'technical' | 'project_mixed';
  initialSessionId?: string;
  onNavigate: (tab: string) => void;
}

export const InterviewView: React.FC<InterviewViewProps> = ({
  user,
  initialTrack = 'technical',
  initialSessionId,
  onNavigate,
}) => {
  // Session State
  const [selectedTrack, setSelectedTrack] = useState<'hr' | 'technical' | 'project_mixed'>(initialTrack);
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [currentTurn, setCurrentTurn] = useState<{
    turnId: string;
    sequenceNo: number;
    question: string;
    category: string;
    rationale?: string;
    difficulty?: string;
  } | null>(null);

  // Input & Mode States
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [answerText, setAnswerText] = useState('');
  const [transcriptEdited, setTranscriptEdited] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // Feedback State
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackData | null>(null);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);

  // Timer State (20 minutes = 1200 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState(1200);
  const [isPaused, setIsPaused] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  // Voice Recognition & TTS State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Check speech recognition support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = 'en-US';

      recog.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setAnswerText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recog.onerror = () => {
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recog;
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (!activeSession || isPaused || finalReport) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleEndInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession, isPaused, finalReport]);

  // Load existing session if passed
  useEffect(() => {
    if (initialSessionId) {
      api.getInterview(initialSessionId).then((res) => {
        setActiveSession(res.session);
        if (res.session.finalReport) {
          setFinalReport(res.session.finalReport);
        } else if (res.turns.length > 0) {
          const lastTurn = res.turns[res.turns.length - 1];
          setCurrentTurn({
            turnId: lastTurn.id,
            sequenceNo: lastTurn.sequenceNo,
            question: lastTurn.questionText,
            category: lastTurn.questionCategory,
          });
          if (lastTurn.feedback) {
            setCurrentFeedback(lastTurn.feedback);
          }
        }
      }).catch(() => {});
    }
  }, [initialSessionId]);

  const handleStartSession = async (track: 'hr' | 'technical' | 'project_mixed') => {
    setSelectedTrack(track);
    setCurrentFeedback(null);
    setFinalReport(null);
    setAnswerText('');
    setSecondsRemaining(1200);
    setIsPaused(false);

    try {
      const res = await api.startInterview({
        type: track,
        targetDurationMinutes: 20,
        mode: inputMode,
      });

      setActiveSession({
        id: res.sessionId,
        session_type: track,
        mode: inputMode,
        status: 'in_progress',
        target_duration_seconds: res.targetDurationSeconds,
        duration_seconds: 0,
        ended_early: false,
        started_at: new Date().toISOString(),
        ended_at: null,
        created_at: new Date().toISOString(),
      });

      setCurrentTurn(res.currentTurn);
    } catch (err: any) {
      alert('Could not start interview: ' + err.message);
    }
  };

  const handleToggleVoice = () => {
    if (!speechSupported) {
      alert('Web Speech Recognition is not supported in this browser. Please type your answers.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        setIsListening(false);
      }
    }
  };

  const handleSpeakQuestion = () => {
    if (!('speechSynthesis' in window) || !currentTurn) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(currentTurn.question);
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!activeSession || !currentTurn || !answerText.trim()) return;
    setSubmittingAnswer(true);

    try {
      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      }

      const res = await api.submitAnswer(activeSession.id, {
        turnId: currentTurn.turnId,
        answerText: answerText.trim(),
        transcriptEdited,
      });

      setCurrentFeedback(res.feedback);
      // Prepare next turn
      setCurrentTurn(res.nextTurn);
      setAnswerText('');
      setTranscriptEdited(false);
    } catch (err: any) {
      alert('Submission failed: ' + err.message);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleEndInterview = async () => {
    if (!activeSession) return;
    setConfirmEndOpen(false);
    try {
      const res = await api.endInterview(activeSession.id);
      setFinalReport(res.report);
    } catch (err: any) {
      alert('Error concluding session: ' + err.message);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* Track Selection Header (when no active interview) */}
      {!activeSession && !finalReport && (
        <div className="space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/80 border border-violet-500/40 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2 shadow-inner">
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              <span>Realistic Interview Simulation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Select Your 20-Minute Mock Interview Track
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Each session targets at least 20 minutes with adaptive follow-ups, one question at a time, typed or voice answers, and 8-dimension rubric feedback.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mock 1 */}
            <div className="glass-panel-3d card-3d-hover rounded-2xl p-6 border border-slate-800/90 border-t-white/[0.12] flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-950/90 text-indigo-300 font-bold uppercase tracking-wider border border-indigo-700/50 shadow-inner">
                  Track 1
                </span>
                <h3 className="text-base font-bold text-white mt-3 mb-2">HR & Behavioral</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Evaluates your self-introduction, career motivations, STAR situational stories, teamwork, conflict management, and alignment with company culture.
                </p>
                <div className="text-[11px] text-slate-300 space-y-2 border-t border-slate-800/80 pt-3 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>STAR Method Scoring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Communication Clarity & Tone</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartSession('hr')}
                className="w-full btn-3d-secondary py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5" /> Start HR Track
              </button>
            </div>

            {/* Mock 2 */}
            <div className="glass-panel-3d card-3d-hover rounded-2xl p-6 border border-cyan-500/40 border-t-white/[0.18] bg-gradient-to-b from-slate-900/95 via-indigo-950/50 to-slate-950/95 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />
              <div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 font-bold uppercase tracking-wider border border-cyan-600/50 shadow-inner">
                  Track 2 • Recommended
                </span>
                <h3 className="text-base font-bold text-white mt-3 mb-2">Technical & Architecture</h3>
                <p className="text-xs text-slate-300/90 leading-relaxed mb-4">
                  Drills deep into role requirements: database concurrency, idempotency, caching, distributed systems, clean architecture, and practical engineering trade-offs.
                </p>
                <div className="text-[11px] text-slate-300 space-y-2 border-t border-slate-800/80 pt-3 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Technical Correctness Scoring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Adaptive Difficulty Follow-Ups</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartSession('technical')}
                className="w-full btn-3d-primary py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5" /> Start Technical Track
              </button>
            </div>

            {/* Mock 3 */}
            <div className="glass-panel-3d card-3d-hover rounded-2xl p-6 border border-slate-800/90 border-t-white/[0.12] flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-violet-950/90 text-violet-300 font-bold uppercase tracking-wider border border-violet-700/50 shadow-inner">
                  Track 3
                </span>
                <h3 className="text-base font-bold text-white mt-3 mb-2">Project Deep Dive</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Explores every major project on your resume: architecture decisions, technical challenges, scale limitations, metrics achieved, and bug post-mortems.
                </p>
                <div className="text-[11px] text-slate-300 space-y-2 border-t border-slate-800/80 pt-3 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                    <span>Resume Evidence Verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                    <span>Challenge & Trade-Off Defense</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartSession('project_mixed')}
                className="w-full btn-3d-secondary py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5" /> Start Project Track
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Interview Arena */}
      {activeSession && !finalReport && currentTurn && (
        <div className="space-y-6">
          {/* Header Status Bar */}
          <div className="glass-panel-3d p-4 rounded-2xl border border-slate-800/90 border-t-white/[0.12] flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              <div>
                <span className="text-xs font-bold text-white capitalize">
                  {activeSession.session_type === 'hr'
                    ? 'Track 1: HR & Behavioral'
                    : activeSession.session_type === 'technical'
                    ? 'Track 2: Technical Concurrency & Design'
                    : 'Track 3: Resume Project Deep Dive'}
                </span>
                <span className="text-slate-500 text-xs mx-2">•</span>
                <span className="text-xs text-cyan-400 font-semibold">Question #{currentTurn.sequenceNo}</span>
              </div>
            </div>

            {/* Timer & Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs font-bold text-cyan-300 shadow-inner">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>

              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
                title={isPaused ? 'Resume interview' : 'Pause interview'}
                aria-label={isPaused ? 'Resume interview' : 'Pause interview'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              <button
                onClick={() => setConfirmEndOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 hover:bg-rose-900/50 text-xs font-semibold transition-colors cursor-pointer"
              >
                End Session
              </button>
            </div>
          </div>

          {/* Question Display Card */}
          <div className="glass-panel-3d p-6 sm:p-8 rounded-3xl border border-violet-500/40 border-t-white/[0.18] bg-gradient-to-br from-slate-900/95 via-indigo-950/50 to-slate-900/95 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-600/30 text-cyan-300 border border-violet-500/40 shadow-inner">
                    {currentTurn.category}
                  </span>
                  {currentTurn.difficulty && (
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {currentTurn.difficulty} Level
                    </span>
                  )}
                </div>

                {/* TTS Read Aloud */}
                <button
                  onClick={handleSpeakQuestion}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer font-semibold transition-colors"
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4 text-rose-400 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isSpeaking ? 'Stop Audio' : 'Read Aloud'}</span>
                </button>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-relaxed">
                "{currentTurn.question}"
              </h2>

              {currentTurn.rationale && (
                <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-800/80">
                  <strong className="text-slate-300 font-semibold">Interviewer Intent:</strong> {currentTurn.rationale}
                </p>
              )}
            </div>
          </div>

          {/* Answer Composer Area */}
          <div className="glass-panel-3d p-6 rounded-2xl border border-slate-800/90 border-t-white/[0.12] space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white">Your Response</span>
                {speechSupported && (
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isListening
                        ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse shadow-md shadow-rose-950/50'
                        : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{isListening ? 'Stop Recording' : 'Speak Answer'}</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] text-slate-400 font-medium">
                {answerText.trim().split(/\s+/).filter(Boolean).length} words
              </div>
            </div>

            {/* Answer text editor */}
            <textarea
              rows={6}
              value={answerText}
              onChange={(e) => {
                setAnswerText(e.target.value);
                setTranscriptEdited(true);
              }}
              placeholder={
                isListening
                  ? 'Listening... Speak naturally. You can edit the transcribed text before submitting.'
                  : 'Type your answer here, or click "Speak Answer" to use microphone input...'
              }
              className="input-3d w-full p-4 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-400">
                Tip: Use STAR structure for behavioral questions. Quantify trade-offs for technical questions.
              </span>

              <button
                onClick={handleSubmitAnswer}
                disabled={submittingAnswer || !answerText.trim()}
                className="w-full sm:w-auto btn-3d-primary px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {submittingAnswer ? (
                  <span>Evaluating Rubric...</span>
                ) : (
                  <>
                    <span>Submit For Evaluation</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback Display (Appears immediately after submitting) */}
          {currentFeedback && (
            <div className="glass-panel-3d p-6 sm:p-8 rounded-3xl border border-cyan-500/40 border-t-white/[0.15] bg-slate-900/95 space-y-6 animate-fadeIn shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">8-Dimension Rubric Scorecard</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Turn #{currentTurn.sequenceNo - 1} Feedback</span>
              </div>

              {/* 8 Metric Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(currentFeedback.scores).map(([key, val]) => {
                  const label = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (str) => str.toUpperCase());
                  const pct = (val / 5) * 100;
                  return (
                    <div key={key} className="p-3 bg-slate-950/80 border border-slate-800/90 rounded-xl shadow-sm">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-300 font-medium truncate">{label}</span>
                        <span className="text-cyan-400 font-bold">{val.toFixed(1)}/5</span>
                      </div>
                      <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden p-0.5">
                        <div
                          className="bg-gradient-to-r from-violet-500 to-cyan-400 h-full rounded-full transition-all shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* What Worked & Missing Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/50 shadow-sm">
                  <h4 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> What You Did Well
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-1.5">
                    {currentFeedback.whatWorked.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-900/50 shadow-sm">
                  <h4 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Missing Points & Opportunities
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-1.5">
                    {currentFeedback.missingPoints.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Improved Sample Answer */}
              {currentFeedback.improvedAnswer && (
                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 shadow-sm">
                  <h4 className="text-xs font-bold text-violet-400 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Evidence-Based Model Answer Outline</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    "{currentFeedback.improvedAnswer}"
                  </p>
                </div>
              )}

              {/* Practice Task & Next Steps */}
              {currentFeedback.practiceTask && (
                <div className="p-3.5 rounded-xl bg-violet-950/40 border border-violet-800/50 flex items-start gap-3 shadow-inner">
                  <BookOpen className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-white">Recommended Practice Task:</span>
                    <p className="text-xs text-slate-300 mt-0.5">{currentFeedback.practiceTask}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Final Completion Report View */}
      {finalReport && (
        <div className="glass-panel-3d p-6 sm:p-8 rounded-3xl border border-violet-500/40 border-t-white/[0.15] bg-gradient-to-br from-slate-900/95 via-indigo-950/50 to-slate-900/95 space-y-6 animate-fadeIn shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Session Completed</span>
              <h2 className="text-2xl font-extrabold text-white mt-1">
                Final Mock Interview Scorecard: <span className="text-cyan-400">{finalReport.overallScore}/5.0</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {finalReport.summary}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => { setActiveSession(null); setFinalReport(null); }}
                className="btn-3d-primary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Start Another Session
              </button>
              <button
                onClick={() => onNavigate('history')}
                className="btn-3d-secondary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                View in History
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 shadow-sm">
              <span className="text-[11px] text-slate-500 uppercase font-bold">Total Duration</span>
              <div className="text-lg font-extrabold text-white mt-1">
                {Math.round(finalReport.durationSeconds / 60)} min ({finalReport.durationSeconds}s)
              </div>
              <span className="text-[10px] text-slate-400">
                {finalReport.endedEarly ? 'Ended Early' : 'Full 20-min session'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 shadow-sm">
              <span className="text-[11px] text-slate-500 uppercase font-bold">Questions Answered</span>
              <div className="text-lg font-extrabold text-cyan-400 mt-1">
                {finalReport.questionsAnswered}
              </div>
              <span className="text-[10px] text-slate-400">Evaluated with rubrics</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 shadow-sm">
              <span className="text-[11px] text-slate-500 uppercase font-bold">Technical Score</span>
              <div className="text-lg font-extrabold text-emerald-400 mt-1">
                {finalReport.categoryScores?.technicalCorrectness || 4.5}/5.0
              </div>
              <span className="text-[10px] text-slate-400">Factual accuracy</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 shadow-sm">
              <span className="text-[11px] text-slate-500 uppercase font-bold">English Delivery</span>
              <div className="text-lg font-extrabold text-violet-400 mt-1">
                {finalReport.categoryScores?.grammarVocabulary || 4.6}/5.0
              </div>
              <span className="text-[10px] text-slate-400">Grammar & clarity</span>
            </div>
          </div>

          {/* Practice Recommendations */}
          <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-inner">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Priority Revision Tasks</h4>
            <ul className="text-xs text-slate-300 space-y-2">
              {finalReport.practiceTasks.map((t, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* End Early Confirmation Dialog */}
      {confirmEndOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm p-6 bg-slate-900 border border-slate-800 border-t-white/[0.15] rounded-3xl shadow-2xl text-center space-y-4">
            <h3 className="text-base font-bold text-white">End Interview Early?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your elapsed time and answered questions will be saved honestly. A scorecard will be generated based on your answers so far.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setConfirmEndOpen(false)}
                className="btn-3d-secondary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Continue Interview
              </button>
              <button
                onClick={handleEndInterview}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-md shadow-rose-950"
              >
                Confirm End
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
