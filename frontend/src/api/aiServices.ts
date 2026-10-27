/**
 * Servicios de API para las funcionalidades con IA (ver docs/AI_FEATURES_API_CONTRACT.md).
 * Todas las llamadas de IA usan un timeout amplio porque el LLM puede tardar varios segundos.
 */
import api, { graduatesApi, matchmakingApi, dashboardApi } from './index';

const AI_TIMEOUT = { timeout: 60000 };

export type AiSource = 'groq' | 'heuristic';

export interface AiMeta {
  source: AiSource;
  model: string | null;
  generated_at: string;
}

// ── A. Copiloto IA del egresado ──────────────────────────────────────────────
export type CoachSectionKey =
  | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'visibility';

export interface CoachSection {
  key: CoachSectionKey;
  label: string;
  score: number;
  status: 'critical' | 'improve' | 'good' | 'excellent';
  findings: string[];
  actions: string[];
}

export interface CoachAnalysis extends AiMeta {
  overall_score: number;
  level: 'Inicial' | 'En desarrollo' | 'Competitivo' | 'Destacado';
  headline: string;
  suggested_headline: string;
  sections: CoachSection[];
  quick_wins: { title: string; detail: string; impact: 'high' | 'medium' | 'low'; section: string }[];
  improved_summary: string;
  skills_to_add: { name: string; reason: string }[];
  keywords: string[];
  plan_30_days: { week: number; goal: string; tasks: string[] }[];
}

export interface CoachRewrite extends AiMeta {
  original: string;
  improved: string;
  changes: string[];
  warnings: string[];
}

export interface CoachChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CoachChatReply extends AiMeta {
  reply: string;
  suggestions: string[];
}

export const getAiStatus = () =>
  graduatesApi.get<{ enabled: boolean; model: string | null }>('/ai/status');

export const analyzeProfileWithAi = (targetRole?: string) =>
  graduatesApi.post<CoachAnalysis>('/ai/coach/analyze', targetRole ? { target_role: targetRole } : {}, AI_TIMEOUT);

export const rewriteWithAi = (data: {
  field: 'summary' | 'experience' | 'project' | 'headline' | 'cover_letter';
  text: string;
  context?: { position?: string; company?: string; job_title?: string };
}) => graduatesApi.post<CoachRewrite>('/ai/coach/rewrite', data, AI_TIMEOUT);

export const chatWithCoach = (messages: CoachChatMessage[]) =>
  graduatesApi.post<CoachChatReply>('/ai/coach/chat', { messages }, AI_TIMEOUT);

// ── B. Reclutamiento a ciegas + dictamen IA ──────────────────────────────────
export interface BlindCandidate {
  id: number;
  job_offer_id: number;
  alias: string;
  status: 'POSTULADO' | 'EN_EVALUACION' | 'ENTREVISTADO' | 'CONTRATADO' | 'RECHAZADO';
  application_date: string;
  match_score: number | null;
  identity_revealed: boolean;
  headline: string;
  program_id: number | null;
  graduation_year: number | null;
  experience_years: number;
  top_skills: string[];
  cover_letter_available: boolean;
  rejection_reason: string | null;
  sub_processes: any[];
  graduate: { user_id: number; first_name: string; last_name: string; program_id: number; graduation_year: number } | null;
}

export interface BlindProfile {
  application_id: number;
  alias: string;
  identity_revealed: boolean;
  program_id: number | null;
  graduation_year: number | null;
  experience_years: number;
  availability_status: string | null;
  preferred_modality: string | null;
  expected_salary: number | null;
  profile_summary: string;
  skills: { name: string; level: string | null }[];
  experiences: { position: string; duration_months: number; is_current: boolean; description: string }[];
  education: { degree: string; year_completed: number | null }[];
  certifications: { name: string; year: number | null }[];
  projects: { title: string; description: string; technologies: string }[];
  cover_letter: string | null;
  match_score: number | null;
}

export interface BlindAiSummary extends AiMeta {
  application_id: number;
  alias: string;
  fit_label: 'Alto' | 'Medio' | 'Bajo';
  fit_score: number;
  executive_summary: string;
  strengths: string[];
  gaps: string[];
  evidence: string[];
  interview_questions: string[];
  bias_guard: string;
}

export const getBlindApplications = (jobOfferId: number) =>
  api.get<BlindCandidate[]>(`/applications/job/${jobOfferId}/blind`);

export const getBlindProfile = (applicationId: number) =>
  api.get<BlindProfile>(`/applications/${applicationId}/blind-profile`);

export const getBlindAiSummary = (applicationId: number, force = false) =>
  api.post<BlindAiSummary>(`/applications/${applicationId}/ai-summary`, { force }, AI_TIMEOUT);

// ── C. Radiografía de competencia en vivo ────────────────────────────────────
export interface ApplicantBenchmark {
  job_offer_id: number;
  job_title: string;
  applied: boolean;
  application_status: string;
  total_applicants: number;
  my_rank: number;
  percentile: number;
  competitiveness: string;
  my_score: number;
  avg_score: number | null;
  median_score: number | null;
  top_score: number | null;
  stats_hidden: boolean;
  breakdown: { key: 'skills' | 'experience' | 'program'; label: string; mine: number; avg: number | null; top: number | null }[];
  stage_distribution: { status: string; count: number }[];
  my_gaps: { skill: string; required_level: string | null }[];
  strengths: string[];
  improvement_levers: { title: string; detail: string; estimated_gain: number }[];
  ai_tips: { source: AiSource; model: string | null; summary: string; tips: string[] } | null;
  updated_at: string;
}

export const getApplicantBenchmark = (jobOfferId: number, includeAi = true) =>
  matchmakingApi.get<ApplicantBenchmark>(`/benchmark/${jobOfferId}`, {
    params: { include_ai: includeAi },
    timeout: 60000,
  });

// ── D. Mapa de calor por cohorte ─────────────────────────────────────────────
export interface CohortCell {
  program_id: number;
  program: string;
  year: number;
  graduates: number;
  hired: number;
  employment_rate: number | null;
  avg_days_to_first_hire: number | null;
  avg_salary: number | null;
  remote_pct: number | null;
  hybrid_pct: number | null;
  onsite_pct: number | null;
  top_sector: string | null;
  low_sample: boolean;
}

export interface CohortData {
  generated_at: string;
  audience: 'admin' | 'graduate';
  programs: { id: number; name: string }[];
  years: number[];
  cells: CohortCell[];
  summary: {
    total_graduates: number;
    overall_employment_rate: number | null;
    best_cohort: { program: string; year: number; employment_rate: number } | null;
    highest_salary_cohort: { program: string; year: number; avg_salary: number } | null;
    fastest_cohort: { program: string; year: number; avg_days_to_first_hire: number } | null;
  };
  modality_mix: { modality: string; count: number }[];
  sector_salary: { sector: string; avg_salary: number; hires: number }[];
  metrics_notes: { time_to_hire: string };
}

export interface AiInsights extends AiMeta {
  audience: 'admin' | 'graduate';
  headline: string;
  insights: { title: string; detail: string; tone: 'positive' | 'warning' | 'neutral' }[];
  recommendations: string[];
}

export interface CohortFilters {
  program_id?: number | null;
  year_min?: number | null;
  year_max?: number | null;
}

export const getCohortHeatmap = (filters: CohortFilters = {}) =>
  dashboardApi.get<CohortData>('/dashboard/cohorts', { params: filters });

export const getCohortInsights = (filters: CohortFilters = {}) =>
  dashboardApi.post<AiInsights>('/dashboard/cohorts/insights', filters, AI_TIMEOUT);

// ── E. Tablero ejecutivo: resumen IA ─────────────────────────────────────────
export const getExecutiveInsights = (filters: CohortFilters & { modality?: string | null } = {}) =>
  dashboardApi.post<AiInsights>('/dashboard/admin/analytics/insights', filters, AI_TIMEOUT);

