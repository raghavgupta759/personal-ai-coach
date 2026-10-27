export interface User {
  id: string;
  name: string;
  email: string;
  preferred_language: string;
  target_role: string | null;
  target_company: string | null;
  experience_level: string | null;
}

export interface DocumentRecord {
  id: string;
  document_type: 'resume' | 'jd';
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  extracted_text: string;
  extraction_status: string;
  created_at: string;
}

export interface RequirementMatch {
  requirement: string;
  status: 'matched' | 'partial' | 'missing' | 'not_assessable';
  evidence: string;
  importance: 'high' | 'medium' | 'low';
}

export interface StudyPlanDay {
  day: number;
  focus: string;
  task: string;
}

export interface AnalysisData {
  overallMatchScore: number;
  profileSummary: string;
  requirementsMatch: RequirementMatch[];
  strengths: string[];
  gaps: string[];
  truthfulKeywordSuggestions: string[];
  likelyTopics: string[];
  studyPlan: StudyPlanDay[];
  uncertaintyNotes: string[];
}

export interface AnalysisRecord {
  id: string;
  targetRole: string;
  targetCompany: string;
  status: string;
  createdAt: string;
  result: AnalysisData;
}

export interface FeedbackScores {
  technicalCorrectness: number;
  relevance: number;
  completeness: number;
  structure: number;
  communicationClarity: number;
  grammarVocabulary: number;
  conciseness: number;
  projectEvidence: number;
}

export interface FeedbackData {
  scores: FeedbackScores;
  whatWorked: string[];
  missingPoints: string[];
  technicalCorrections: string[];
  grammarSuggestions: string[];
  improvedAnswer: string;
  practiceTask: string;
  suggestedFollowUp: string;
}

export interface InterviewTurn {
  id: string;
  sequenceNo: number;
  questionText: string;
  questionCategory: string;
  answerText?: string | null;
  transcriptEdited?: boolean;
  feedback?: FeedbackData | null;
  askedAt: string;
  answeredAt?: string | null;
}

export interface FinalReport {
  overallScore: number;
  durationSeconds: number;
  targetDurationSeconds: number;
  endedEarly: boolean;
  questionsAnswered: number;
  categoryScores: Record<string, number>;
  summary: string;
  practiceTasks: string[];
}

export interface InterviewSession {
  id: string;
  session_type: 'hr' | 'technical' | 'project_mixed';
  mode: 'text' | 'voice';
  status: 'created' | 'in_progress' | 'completed' | 'paused';
  target_duration_seconds: number;
  duration_seconds: number;
  ended_early: number | boolean;
  started_at: string;
  ended_at: string | null;
  finalReport?: FinalReport | null;
  created_at: string;
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant' | 'system_summary';
  content: string;
  citations?: string[];
  created_at: string;
}

export interface CoachConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyFact {
  claim: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceDate: string;
  sourceType: 'official' | 'third_party' | 'user_provided' | 'unverified';
  confidence: 'high' | 'medium' | 'estimated';
}

export interface CompanyResearch {
  company: string;
  targetRole: string;
  overview: string;
  foundedOrHq?: string;
  coreProducts: string[];
  techStackHighlights: string[];
  cultureAndValues: string[];
  publicInterviewStyleNotes: string[];
  sourcedFacts: CompanyFact[];
  practiceQuestions: {
    question: string;
    category: 'TECHNICAL' | 'HR_BEHAVIORAL' | 'SYSTEM_DESIGN';
    rationales: string;
    isVerifiedHistoricalQuestion: boolean;
    sourceCitation?: string;
  }[];
  researchDate: string;
  isSearchLive: boolean;
  limitationsNote: string;
}

export interface StudyPackRecord {
  id: string;
  title: string;
  status: string;
  created_at: string;
  content?: {
    userName: string;
    targetRole: string;
    targetCompany: string;
    generationDate: string;
    analysis: AnalysisData;
    companyResearch: CompanyResearch;
  };
}
