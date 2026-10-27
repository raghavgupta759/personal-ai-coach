import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  Mic,
  MicOff,
  Square,
  Copy,
  Check,
  ChevronDown,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api';
import type { User, CoachMessage, CoachConversation } from '../types';
import { MarkdownContent } from './MarkdownContent';

interface CoachViewProps {
  user: User;
}

export const CoachView: React.FC<CoachViewProps> = ({ user }) => {
  const [conversations, setConversations] = useState<CoachConversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([
    'How should I structure my "Tell me about yourself" answer?',
    'How do I explain my missing skills truthfully?',
    'Give me a STAR answer for technical conflict based on my background',
    'What architecture questions are most likely for this role?',
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const userScrolledUpRef = useRef<boolean>(false);

  // Load conversations on mount
  useEffect(() => {
    async function fetchConvos() {
      try {
        const res = await api.listCoachConversations();
        setConversations(res.conversations || []);
        if (res.conversations && res.conversations.length > 0) {
          const firstId = res.conversations[0].id;
          setActiveConvoId(firstId);
          const detail = await api.getCoachConversation(firstId);
          setMessages(detail.messages || []);
        } else {
          // Default initial welcome message
          setMessages([
            {
              id: 'init-1',
              role: 'assistant',
              content: `Hello **${user.name}**! I am your **Personal AI Coach**.\n\nI have loaded and cross-referenced your **verified resume**, target role (**${user.target_role || 'Senior Software Engineer'}**), target company (**${user.target_company || 'Tech Company'}**), and previous mock session data.\n\nAsk me anything in real-time — we can:\n- Rehearse elevator pitches and behavioral STAR stories\n- Dissect difficult technical architecture or system design questions\n- Practice answers tailored to your specific background\n\nHow can I help you prepare today?`,
              citations: ['Verified Resume', 'Target Role Profile', 'AI Coach Framework'],
              created_at: new Date().toISOString(),
            },
          ]);
        }
      } catch (e) {
        // Safe fallback
      }
    }
    fetchConvos();
  }, [user]);

  // Smart Auto-scroll: only scrolls if the user hasn't explicitly scrolled up
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isUp = distanceToBottom > 120;
    userScrolledUpRef.current = isUp;
    setShowScrollBottom(isUp);
  };

  // Follow stream scrolling
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      scrollToBottom(false);
    }
  }, [messages, isThinking]);

  // Handle Speech Recognition for voice queries
  const toggleSpeechRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use text typing.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputMessage(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Stop Generation Midway
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsThinking(false);
    setStreamingMessageId(null);
  };

  // Stream Coach Message (ChatGPT-like)
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isStreaming) return;

    setInputMessage('');
    setIsStreaming(true);
    setIsThinking(true);
    userScrolledUpRef.current = false;

    // Add user message to UI immediately
    const tempUserMsgId = `user-${Date.now()}`;
    const userMsg: CoachMessage = {
      id: tempUserMsgId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setTimeout(() => scrollToBottom(true), 50);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const assistantTempId = `assistant-stream-${Date.now()}`;
    let hasReceivedFirstChunk = false;

    await api.streamCoachMessage(
      {
        conversationId: activeConvoId || undefined,
        message: text,
      },
      {
        onInit: (data) => {
          if (!activeConvoId) {
            setActiveConvoId(data.conversationId);
          }
        },
        onChunk: (_chunk, accumulated) => {
          if (!hasReceivedFirstChunk) {
            hasReceivedFirstChunk = true;
            setIsThinking(false);
            setStreamingMessageId(assistantTempId);

            // Create initial placeholder for the streaming assistant bubble
            setMessages((prev) => [
              ...prev,
              {
                id: assistantTempId,
                role: 'assistant',
                content: accumulated,
                citations: [],
                created_at: new Date().toISOString(),
              },
            ]);
          } else {
            // Update streaming content in real time
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantTempId
                  ? { ...m, content: accumulated }
                  : m
              )
            );
          }
        },
        onDone: (data) => {
          setIsStreaming(false);
          setIsThinking(false);
          setStreamingMessageId(null);
          abortControllerRef.current = null;

          // Replace temp streaming message with completed finalized message & citations
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantTempId
                ? {
                    ...m,
                    id: data.messageId || assistantTempId,
                    content: data.answer,
                    citations: data.citations || [],
                  }
                : m
            )
          );

          if (data.suggestedFollowUps && data.suggestedFollowUps.length > 0) {
            setSuggestedFollowUps(data.suggestedFollowUps);
          }

          setTimeout(() => scrollToBottom(true), 100);
        },
        onError: (err) => {
          setIsStreaming(false);
          setIsThinking(false);
          setStreamingMessageId(null);
          abortControllerRef.current = null;

          // Show polite error bubble
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: 'assistant',
              content: `I ran into a temporary connection interruption (${err.message}). You can ask again or click one of the suggested prompts below.`,
              citations: ['System Notice'],
              created_at: new Date().toISOString(),
            },
          ]);
        },
      },
      abortController.signal
    );
  };

  const handleCopyMessage = (id: string, text: string) => {
    // Strip metadata footer if any
    const clean = text
      .replace(/\n*---\s*\n*(?:CITATIONS:|FOLLOW_UPS:|SUGGESTIONS:)[\s\S]*$/i, '')
      .replace(/(?:CITATIONS:|FOLLOW_UPS:|SUGGESTIONS:)[\s\S]*$/i, '');
    navigator.clipboard.writeText(clean);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleClearConversation = async () => {
    if (isStreaming) {
      handleStopGeneration();
    }
    if (!activeConvoId) {
      setMessages([]);
      return;
    }
    if (confirm('Clear this coaching conversation history?')) {
      try {
        await api.deleteCoachConversation(activeConvoId);
        setActiveConvoId(null);
        setMessages([
          {
            id: 'init-cleared',
            role: 'assistant',
            content: `Conversation refreshed! What interview topic or challenge would you like to tackle next?`,
            citations: ['Clean Session'],
            created_at: new Date().toISOString(),
          },
        ]);
        const convosRes = await api.listCoachConversations();
        setConversations(convosRes.conversations || []);
      } catch {
        setMessages([]);
      }
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-12 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Real-Time Contextual Coach</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
            <span className="text-[10px] text-emerald-300 font-mono">LIVE STREAMING</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>Ask Me: Personal AI Coach</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Fast, streaming interview preparation grounded in your resume, target role, and past mock evaluations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearConversation}
            disabled={isStreaming}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/40 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Main Chat Box */}
      <div className="glass-panel-3d rounded-3xl border border-slate-800/90 border-t-white/[0.15] flex flex-col h-[640px] overflow-hidden shadow-2xl relative bg-slate-950/70 backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Messages Scroll Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 relative z-10 scrollbar-thin"
        >
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isMsgStreaming = isStreaming && msg.id === streamingMessageId;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-2xl shrink-0 flex items-center justify-center text-xs font-bold shadow-md select-none ${
                    isUser
                      ? 'bg-gradient-to-tr from-violet-600 to-cyan-500 text-white border border-white/20'
                      : 'bg-slate-900 border border-violet-500/40 text-cyan-300 shadow-inner'
                  }`}
                >
                  {isUser ? user.name.charAt(0).toUpperCase() : <Sparkles className="w-4 h-4 text-cyan-400" />}
                </div>

                {/* Message Bubble Container */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg relative group transition-all duration-150 ${
                      isUser
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-none border border-violet-400/30 shadow-violet-950/60'
                        : 'bg-slate-900/90 border border-slate-800/90 border-t-white/[0.08] text-slate-200 rounded-tl-none backdrop-blur-md'
                    }`}
                  >
                    {/* User message: clean text */}
                    {isUser ? (
                      <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                    ) : (
                      /* Assistant message: rich streaming markdown */
                      <MarkdownContent content={msg.content} isStreaming={isMsgStreaming} />
                    )}

                    {/* Copy Button for Assistant */}
                    {!isUser && !isMsgStreaming && (
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white text-[10px] flex items-center gap-1 cursor-pointer border border-slate-700/50"
                        title="Copy answer"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Citations / Grounding Footer */}
                    {!isUser && !isMsgStreaming && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>Grounded In:</span>
                        </div>
                        {msg.citations.map((cite, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-[10px] text-cyan-300 font-medium shadow-inner flex items-center gap-1"
                          >
                            <span className="w-1 h-1 rounded-full bg-cyan-400" />
                            <span>{cite}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ChatGPT-like Subtle Thinking Indicator before first token arrives */}
          {isThinking && (
            <div className="flex gap-3 mr-auto animate-fadeIn">
              <div className="w-9 h-9 rounded-2xl bg-slate-900 border border-violet-500/40 text-cyan-300 flex items-center justify-center shadow-inner">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 text-xs text-slate-300 flex items-center gap-3 shadow-md rounded-tl-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
                </div>
                <span className="text-slate-400 text-xs font-medium">
                  AI Coach is preparing answer from your profile...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Jump to Bottom Button if user scrolled up during stream */}
        {showScrollBottom && (
          <button
            onClick={() => {
              userScrolledUpRef.current = false;
              scrollToBottom(true);
            }}
            className="absolute bottom-32 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-xs text-cyan-300 border border-slate-700 shadow-xl backdrop-blur-md cursor-pointer transition-all animate-bounce"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Latest message</span>
          </button>
        )}

        {/* Suggested Prompts Bar */}
        {suggestedFollowUps.length > 0 && !isStreaming && (
          <div className="px-4 py-2 border-t border-slate-800/70 bg-slate-950/60 backdrop-blur-md flex items-center gap-2 overflow-x-auto scrollbar-none relative z-10">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Suggested:</span>
            </span>
            {suggestedFollowUps.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isStreaming}
                className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 hover:border-violet-500/50 hover:bg-slate-800/90 text-[11px] text-slate-300 hover:text-white whitespace-nowrap transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Composer Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-800/90 bg-slate-900/95 backdrop-blur-md relative z-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Voice Input Button */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              disabled={isStreaming}
              className={`p-3 rounded-xl border transition-all cursor-pointer shrink-0 ${
                isListening
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
              title={isListening ? 'Listening... click to stop' : 'Voice input (speak question)'}
            >
              {isListening ? <Mic className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Input Field */}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isStreaming}
              placeholder={
                isListening
                  ? 'Listening to your voice...'
                  : 'Ask about your projects, STAR behavioral answers, system design trade-offs...'
              }
              className="input-3d flex-1 px-4 py-3 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none disabled:opacity-60"
            />

            {/* Send or Stop Generation Button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/60 transition-all cursor-pointer shrink-0"
                title="Stop streaming"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="btn-3d-primary p-3 rounded-xl disabled:opacity-40 cursor-pointer flex items-center justify-center shrink-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Footer Subtext */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Real-time progressive token streaming via Gemini API</span>
            </span>
            <span className="text-slate-400 hidden sm:inline">
              Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px]">Enter</kbd> to send
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
