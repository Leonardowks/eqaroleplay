// ─── Session Types ────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'persona' | 'assistant' | string;
  content: string;
  created_at?: string;
}

export interface Competency {
  id: string;
  competency_name: string;
  score: number;
  feedback: string | null;
  spin_category?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sub_scores?: any;
  sub_scores_feedback?: any;
  criterion_approvals?: any;
  ai_suggestions?: any;
  [key: string]: unknown;
}

export interface SessionData {
  id: string;
  user_id: string;
  persona_id: string;
  meeting_type: string;
  method: string;
  status: string | null;
  overall_score: number | null;
  duration_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  executive_summary: string | null;
  highlights: string[] | null;
  recommendations: string[] | null;
  organization_id: string | null;
  voice_metrics?: Record<string, unknown> | null;
}

// ─── Persona Types ───────────────────────────────────────────────────────────

export interface Persona {
  id: string;
  name: string;
  role: string;
  company: string;
  sector: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string | null;
  avatar_url?: string | null;
  organization_id?: string | null;
  personality_traits?: string[] | null;
  pain_points?: string[] | null;
  objection_patterns?: string[] | null;
  buying_signals?: string[] | null;
}

// ─── User Types ──────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  organization_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type AppRole = 'admin' | 'moderator' | 'user' | 'superadmin';

// ─── Organization Types ──────────────────────────────────────────────────────

export interface ICPConfig {
  buyer_role: string;
  main_pains: string[];
  common_objections: string[];
  sophistication_level: 'iniciante' | 'intermediario' | 'avancado';
}

export interface CompanyConfig {
  company_name: string;
  segment: string;
  product_description: string;
  ticket_range: string;
  sales_cycle: string;
  icp: ICPConfig;
  methodology: 'SPIN' | 'BANT' | 'Challenger Sale' | 'Sandler' | 'Consultiva' | 'Nenhuma';
  sales_stages: string[];
  competencies: string[];
  competency_weights?: Record<string, number>;
  tone: string;
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
  custom_domain: string | null;
  company_config: CompanyConfig | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Invitation Types ────────────────────────────────────────────────────────

export interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  personal_message: string | null;
  expires_at: string;
  accepted_at: string | null;
  organization_id: string;
}
