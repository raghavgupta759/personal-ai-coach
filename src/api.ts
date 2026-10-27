import type {
  User,
  DocumentRecord,
  AnalysisRecord,
  AnalysisData,
  InterviewSession,
  InterviewTurn,
  FeedbackData,
  FinalReport,
  CoachConversation,
  CoachMessage,
  CompanyResearch,
  StudyPackRecord,
} from './types';

const TOKEN_KEY = 'personal_ai_coach_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set json content type if body is not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setStoredToken(null);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error?.message || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  async register(body: { name: string; email: string; password: string; target_role?: string; target_company?: string; experience_level?: string }) {
    const data = await request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setStoredToken(data.token);
    return data;
  },

  async login(body: { email: string; password: string }) {
    const data = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setStoredToken(data.token);
    return data;
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  async getMe() {
    return request<{ user: User }>('/api/me');
  },

  async updateMe(body: Partial<User>) {
    return request<{ user: User }>('/api/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async deleteAccount() {
    return request('/api/me', { method: 'DELETE' });
  },

  // Documents
  async uploadResume(fileOrText: { file?: File; text?: string }) {
    if (fileOrText.file) {
      const formData = new FormData();
      formData.append('file', fileOrText.file);
      return request<{ documentId: string; status: string; filename: string; extractedTextPreview: string; extractedText: string }>('/api/documents/resume', {
        method: 'POST',
        body: formData,
      });
    } else {
      return request<{ documentId: string; status: string; filename: string; extractedTextPreview: string; extractedText: string }>('/api/documents/resume', {
        method: 'POST',
        body: JSON.stringify({ text: fileOrText.text }),
      });
    }
  },

  async uploadJd(fileOrText: { file?: File; text?: string }) {
    if (fileOrText.file) {
      const formData = new FormData();
      formData.append('file', fileOrText.file);
      return request<{ documentId: string; status: string; filename: string; extractedTextPreview: string; extractedText: string }>('/api/documents/jd', {
        method: 'POST',
        body: formData,
      });
    } else {
      return request<{ documentId: string; status: string; filename: string; extractedTextPreview: string; extractedText: string }>('/api/documents/jd', {
        method: 'POST',
        body: JSON.stringify({ text: fileOrText.text }),
      });
    }
  },

  async updateDocText(id: string, extractedText: string) {
    return request<{ success: boolean; message: string }>(`/api/documents/${id}/text`, {
      method: 'PATCH',
      body: JSON.stringify({ extractedText }),
    });
  },

  async getDoc(id: string) {
    return request<{ document: DocumentRecord }>(`/api/documents/${id}`);
  },

  // Analysis
  async runAnalysis(body: { resumeDocumentId: string; jdDocumentId: string; targetRole?: string; targetCompany?: string }) {
    return request<{ analysisId: string; status: string; result: AnalysisData }>('/api/analysis', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getAnalysis(id: string) {
    return request<{ analysis: AnalysisRecord }>(`/api/analysis/${id}`);
  },

  async listAnalyses() {
    return request<{ analyses: { id: string; target_role: string; target_company: string; status: string; created_at: string }[] }>('/api/analyses');
  },

  // Company Research
  async getCompanyResearch(company: string, role?: string) {
    return request<{ research: CompanyResearch }>('/api/company-research', {
      method: 'POST',
      body: JSON.stringify({ company, role }),
    });
  },

  // Mock Interviews
  async startInterview(body: { analysisId?: string; type: 'hr' | 'technical' | 'project_mixed'; targetDurationMinutes?: number; mode?: 'text' | 'voice' }) {
    return request<{
      sessionId: string;
      status: string;
      type: string;
      targetDurationSeconds: number;
      currentTurn: {
        turnId: string;
        sequenceNo: number;
        question: string;
        category: string;
        rationale: string;
        difficulty: string;
      };
    }>('/api/interviews', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getInterview(id: string) {
    return request<{ session: InterviewSession; turns: InterviewTurn[] }>(`/api/interviews/${id}`);
  },

  async submitAnswer(sessionId: string, body: { turnId: string; answerText: string; transcriptEdited?: boolean }) {
    return request<{
      feedback: FeedbackData;
      nextTurn: {
        turnId: string;
        sequenceNo: number;
        question: string;
        category: string;
        rationale: string;
        difficulty: string;
      };
    }>(`/api/interviews/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async endInterview(sessionId: string) {
    return request<{ status: string; report: FinalReport }>(`/api/interviews/${sessionId}/end`, {
      method: 'POST',
    });
  },

  async listInterviews() {
    return request<{ interviews: InterviewSession[] }>('/api/interviews');
  },

  async deleteInterview(id: string) {
    return request(`/api/interviews/${id}`, { method: 'DELETE' });
  },

  // Coach (Ask Me)
  async sendCoachMessage(body: { conversationId?: string; message: string }) {
    return request<{
      conversationId: string;
      answer: string;
      citations: string[];
      suggestedFollowUps: string[];
    }>('/api/coach/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async streamCoachMessage(
    body: { conversationId?: string; message: string },
    handlers: {
      onInit?: (data: { conversationId: string; userMessageId: string }) => void;
      onChunk: (chunk: string, accumulated: string) => void;
      onDone: (data: { messageId: string; answer: string; citations: string[]; suggestedFollowUps: string[] }) => void;
      onError: (error: Error) => void;
    },
    signal?: AbortSignal
  ) {
    const token = getStoredToken();
    try {
      const response = await fetch('/api/coach/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        let errMessage = 'Failed to connect to AI Coach stream';
        try {
          const errData = await response.json();
          if (errData?.error?.message) errMessage = errData.error.message;
        } catch {}
        throw new Error(errMessage);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on this device');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                if (parsed.type === 'init') {
                  handlers.onInit?.(parsed);
                } else if (parsed.type === 'chunk') {
                  accumulated += parsed.text;
                  handlers.onChunk(parsed.text, accumulated);
                } else if (parsed.type === 'done') {
                  handlers.onDone(parsed);
                } else if (parsed.type === 'error') {
                  handlers.onError(new Error(parsed.message || 'Stream error'));
                }
              } catch (e) {
                // Ignore partial JSON
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Expected user cancellation
        return;
      }
      handlers.onError(err instanceof Error ? err : new Error(String(err)));
    }
  },

  async listCoachConversations() {
    return request<{ conversations: CoachConversation[] }>('/api/coach/conversations');
  },

  async getCoachConversation(id: string) {
    return request<{ conversation: CoachConversation; messages: CoachMessage[] }>(`/api/coach/conversations/${id}`);
  },

  async deleteCoachConversation(id: string) {
    return request(`/api/coach/conversations/${id}`, { method: 'DELETE' });
  },

  // Study Packs
  async createStudyPack(analysisId?: string) {
    return request<{ studyPackId: string; status: string; title: string; content: any }>('/api/study-packs', {
      method: 'POST',
      body: JSON.stringify({ analysisId }),
    });
  },

  async listStudyPacks() {
    return request<{ studyPacks: StudyPackRecord[] }>('/api/study-packs');
  },

  async getStudyPack(id: string) {
    return request<{ studyPack: StudyPackRecord }>(`/api/study-packs/${id}`);
  },

  async downloadStudyPackPdf(id: string, filename: string) {
    const token = getStoredToken();
    const res = await fetch(`/api/study-packs/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('PDF download failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'study_pack.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async deleteStudyPack(id: string) {
    return request(`/api/study-packs/${id}`, { method: 'DELETE' });
  },

  // System
  async getReadiness() {
    return request<{ status: string; database: string; aiProvider: string; searchAdapter: string }>('/api/readiness');
  },
};
