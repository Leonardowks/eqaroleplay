-- ========================================
-- SCHEMA SEGURO - Só cria o que não existe
-- ========================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create personas table
CREATE TABLE IF NOT EXISTS public.personas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  company text not null,
  sector text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  description text,
  avatar_url text,
  personality_traits jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

-- Personas are public
DROP POLICY IF EXISTS "Anyone can view personas" ON public.personas;
CREATE POLICY "Anyone can view personas"
  ON public.personas FOR SELECT
  TO authenticated
  USING (true);

-- Create roleplay sessions table
CREATE TABLE IF NOT EXISTS public.roleplay_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  persona_id uuid references public.personas(id) not null,
  meeting_type text not null check (meeting_type in ('prospection', 'discovery', 'presentation', 'negotiation')),
  method text not null check (method in ('voice', 'text')),
  duration_seconds integer default 0,
  overall_score decimal(3,1),
  status text default 'active' check (status in ('active', 'completed')),
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.roleplay_sessions ENABLE ROW LEVEL SECURITY;

-- Sessions policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.roleplay_sessions;
CREATE POLICY "Users can view their own sessions"
  ON public.roleplay_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.roleplay_sessions;
CREATE POLICY "Users can insert their own sessions"
  ON public.roleplay_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.roleplay_sessions;
CREATE POLICY "Users can update their own sessions"
  ON public.roleplay_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create session messages table
CREATE TABLE IF NOT EXISTS public.session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.roleplay_sessions(id) on delete cascade not null,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON public.session_messages;
CREATE POLICY "Users can view messages from their sessions"
  ON public.session_messages FOR SELECT
  USING (
    exists (
      select 1 from public.roleplay_sessions
      where id = session_id and user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages to their sessions" ON public.session_messages;
CREATE POLICY "Users can insert messages to their sessions"
  ON public.session_messages FOR INSERT
  WITH CHECK (
    exists (
      select 1 from public.roleplay_sessions
      where id = session_id and user_id = auth.uid()
    )
  );

-- Create competency scores table
CREATE TABLE IF NOT EXISTS public.competency_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.roleplay_sessions(id) on delete cascade not null,
  competency_name text not null,
  score decimal(3,1) not null check (score >= 0 and score <= 10),
  feedback text,
  created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE public.competency_scores ENABLE ROW LEVEL SECURITY;

-- Scores policies
DROP POLICY IF EXISTS "Users can view scores from their sessions" ON public.competency_scores;
CREATE POLICY "Users can view scores from their sessions"
  ON public.competency_scores FOR SELECT
  USING (
    exists (
      select 1 from public.roleplay_sessions
      where id = session_id and user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert scores to their sessions" ON public.competency_scores;
CREATE POLICY "Users can insert scores to their sessions"
  ON public.competency_scores FOR INSERT
  WITH CHECK (
    exists (
      select 1 from public.roleplay_sessions
      where id = session_id and user_id = auth.uid()
    )
  );

-- Trigger for updating updated_at on profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Add columns to personas
ALTER TABLE personas ADD COLUMN IF NOT EXISTS pain_points JSONB;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS objection_patterns JSONB;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS buying_signals JSONB;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS automation_context JSONB;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS voice_provider TEXT DEFAULT 'openai';
ALTER TABLE personas ADD COLUMN IF NOT EXISTS elevenlabs_voice_id TEXT;

-- Add columns to competency_scores
ALTER TABLE competency_scores ADD COLUMN IF NOT EXISTS spin_category TEXT;
ALTER TABLE competency_scores ADD COLUMN IF NOT EXISTS sub_scores JSONB;
ALTER TABLE competency_scores ADD COLUMN IF NOT EXISTS ai_suggestions JSONB;
ALTER TABLE competency_scores ADD COLUMN IF NOT EXISTS sub_scores_feedback JSONB;
ALTER TABLE competency_scores ADD COLUMN IF NOT EXISTS criterion_approvals JSONB DEFAULT '{}';

-- Add columns to roleplay_sessions
ALTER TABLE roleplay_sessions ADD COLUMN IF NOT EXISTS voice_metrics JSONB;
ALTER TABLE roleplay_sessions ADD COLUMN IF NOT EXISTS highlights TEXT[];
ALTER TABLE roleplay_sessions ADD COLUMN IF NOT EXISTS recommendations TEXT[];
ALTER TABLE roleplay_sessions ADD COLUMN IF NOT EXISTS executive_summary TEXT;

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
CREATE POLICY "Users can view their own achievements"
ON user_achievements FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert achievements" ON user_achievements;
CREATE POLICY "System can insert achievements"
ON user_achievements FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create user_insights table
CREATE TABLE IF NOT EXISTS user_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own insights" ON user_insights;
CREATE POLICY "Users can view their own insights"
ON user_insights FOR SELECT
USING (auth.uid() = user_id);

-- Create role enum (if not exists)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create competency_criteria table
CREATE TABLE IF NOT EXISTS competency_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_name text NOT NULL,
  criterion_key text NOT NULL,
  criterion_name text NOT NULL,
  criterion_description text NOT NULL,
  evaluation_guide text,
  weight numeric DEFAULT 1.0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(competency_name, criterion_key)
);

ALTER TABLE competency_criteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view competency criteria" ON competency_criteria;
CREATE POLICY "Anyone can view competency criteria"
ON competency_criteria FOR SELECT
USING (true);

-- Create session_recommendations table
CREATE TABLE IF NOT EXISTS session_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES roleplay_sessions(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('tactical', 'strategic', 'behavioral')),
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  title text NOT NULL,
  description text NOT NULL,
  action_items jsonb NOT NULL DEFAULT '[]',
  related_competency text,
  expected_impact text,
  time_to_implement text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE session_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view recommendations from their sessions" ON session_recommendations;
CREATE POLICY "Users can view recommendations from their sessions"
ON session_recommendations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM roleplay_sessions
    WHERE roleplay_sessions.id = session_recommendations.session_id
    AND roleplay_sessions.user_id = auth.uid()
  )
);

-- Create achievement_definitions table
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL CHECK (category IN ('milestone', 'performance', 'consistency', 'mastery')),
  criteria jsonb NOT NULL,
  reward_points integer DEFAULT 0,
  badge_color text DEFAULT 'primary',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view achievement definitions" ON achievement_definitions;
CREATE POLICY "Anyone can view achievement definitions"
ON achievement_definitions FOR SELECT
USING (true);

-- Create session_quality_metrics table
CREATE TABLE IF NOT EXISTS public.session_quality_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.roleplay_sessions(id) ON DELETE CASCADE,
  avg_latency_ms INTEGER,
  total_gaps INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  audio_system_used TEXT CHECK (audio_system_used IN ('legacy', 'enhanced')),
  buffer_health_avg TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.session_quality_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own session quality metrics" ON public.session_quality_metrics;
CREATE POLICY "Users can view their own session quality metrics"
ON public.session_quality_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.roleplay_sessions
    WHERE roleplay_sessions.id = session_quality_metrics.session_id
    AND roleplay_sessions.user_id = auth.uid()
  )
);

-- Create views
DROP VIEW IF EXISTS advanced_rankings;
CREATE VIEW advanced_rankings AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  COUNT(DISTINCT rs.id) as total_sessions,
  COALESCE(AVG(rs.overall_score), 0) as avg_score,
  COALESCE(MAX(rs.overall_score), 0) as best_score,
  COALESCE(AVG(cs.score) FILTER (WHERE cs.spin_category = 'situation'), 0) as avg_situation,
  COALESCE(AVG(cs.score) FILTER (WHERE cs.spin_category = 'problem'), 0) as avg_problem,
  COALESCE(AVG(cs.score) FILTER (WHERE cs.spin_category = 'implication'), 0) as avg_implication,
  COALESCE(AVG(cs.score) FILTER (WHERE cs.spin_category = 'need_payoff'), 0) as avg_need_payoff,
  COUNT(DISTINCT ua.achievement_id) as achievements_count,
  MAX(rs.completed_at) as last_activity,
  RANK() OVER (ORDER BY COALESCE(AVG(rs.overall_score), 0) DESC, COUNT(rs.id) DESC) as rank
FROM profiles p
LEFT JOIN roleplay_sessions rs ON rs.user_id = p.id AND rs.status = 'completed'
LEFT JOIN competency_scores cs ON cs.session_id = rs.id
LEFT JOIN user_achievements ua ON ua.user_id = p.id
GROUP BY p.id, p.full_name, p.avatar_url;

DROP VIEW IF EXISTS admin_users_view;
CREATE VIEW public.admin_users_view AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.created_at,
  COALESCE(
    (SELECT jsonb_agg(role) FROM user_roles WHERE user_id = p.id),
    '[]'::jsonb
  ) as roles,
  COUNT(DISTINCT rs.id) as total_sessions,
  AVG(rs.overall_score) as avg_score,
  MAX(rs.completed_at) as last_activity
FROM profiles p
LEFT JOIN roleplay_sessions rs ON rs.user_id = p.id AND rs.status = 'completed'
GROUP BY p.id, p.full_name, p.avatar_url, p.created_at;

-- Admin policies for viewing all data
DROP POLICY IF EXISTS "Admins can view user stats" ON public.profiles;
CREATE POLICY "Admins can view user stats"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all sessions" ON public.roleplay_sessions;
CREATE POLICY "Admins can view all sessions"
ON public.roleplay_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all scores" ON public.competency_scores;
CREATE POLICY "Admins can view all scores"
ON public.competency_scores FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM roleplay_sessions
    WHERE roleplay_sessions.id = competency_scores.session_id
    AND roleplay_sessions.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Admins can view all messages" ON public.session_messages;
CREATE POLICY "Admins can view all messages"
ON public.session_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM roleplay_sessions
    WHERE roleplay_sessions.id = session_messages.session_id
    AND roleplay_sessions.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
);

-- Insert personas
INSERT INTO public.personas (name, role, company, sector, difficulty, description, personality_traits) VALUES
  ('Ricardo Startup', 'Fundador', 'Tech Startup', 'Tecnologia', 'easy', 'Jovem empreendedor, entusiasta de IA, orçamento limitado mas mente aberta', '{"enthusiasm": "high", "openness": "high", "budget_concern": "medium"}'::jsonb),
  ('Marina E-commerce', 'Gerente de Operações', 'Loja Online', 'Varejo Digital', 'easy', 'Sobrecarregada com tarefas manuais, busca eficiência imediata', '{"urgency": "high", "technical_knowledge": "medium", "decision_speed": "fast"}'::jsonb),
  ('André Pequeno Negócio', 'Proprietário', 'Consultoria', 'Serviços', 'easy', 'Precisa automatizar processos administrativos básicos', '{"practicality": "high", "tech_adoption": "medium", "cost_sensitive": "high"}'::jsonb),
  ('Fernanda RH', 'Diretora de Gente', 'Empresa Médio Porte', 'Recursos Humanos', 'medium', 'Quer automatizar recrutamento e onboarding, preocupada com custos', '{"analytical": "high", "risk_averse": "medium", "process_oriented": "high"}'::jsonb),
  ('Carlos Industrial', 'Gerente de Produção', 'Indústria', 'Manufatura', 'medium', 'Tradicional, cético com IA, foca em resultados tangíveis', '{"skepticism": "high", "results_focused": "high", "traditional": "high"}'::jsonb),
  ('Juliana Marketing', 'CMO', 'Agência Digital', 'Marketing', 'medium', 'Conhece automação mas questiona diferencial da sua solução', '{"knowledge": "high", "competitive": "high", "demanding": "high"}'::jsonb),
  ('Dr. Roberto Advogado', 'Sócio', 'Escritório Jurídico', 'Advocacia', 'hard', 'Extremamente preocupado com segurança e compliance, LGPD', '{"security_focused": "very_high", "compliance_strict": "very_high", "detail_oriented": "very_high"}'::jsonb),
  ('Patricia CFO', 'Diretora Financeira', 'Holding', 'Financeiro', 'hard', 'Foca intensamente em ROI, payback e métricas financeiras', '{"analytical": "very_high", "roi_focused": "very_high", "data_driven": "very_high"}'::jsonb),
  ('Gustavo TI', 'CTO', 'Empresa Enterprise', 'Tecnologia', 'hard', 'Técnico, questiona arquitetura, integrações e escalabilidade', '{"technical": "very_high", "critical_thinking": "very_high", "architecture_focused": "very_high"}'::jsonb),
  ('Paulo CFO', 'Chief Financial Officer', 'Empresa Corporativa', 'Serviços Financeiros', 'hard', 'CFO analítico e extremamente orientado a números', '{"analytical": "very_high", "roi_focused": "very_high", "data_driven": "very_high"}'::jsonb),
  ('Beatriz Atendimento', 'Head de Customer Success', 'SaaS B2B', 'Tecnologia', 'easy', 'Líder de CS em SaaS, sobrecarregada com tickets repetitivos', '{"customer_focused": "high", "efficiency": "high", "tech_savvy": "medium"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert achievement definitions
INSERT INTO achievement_definitions (id, name, description, icon, category, criteria, reward_points, badge_color) VALUES
('first_session', 'Primeira Sessão', 'Completou sua primeira sessão de roleplay', 'Rocket', 'milestone', '{"sessions_count": 1}', 10, 'primary'),
('sessions_10', '10 Sessões', 'Completou 10 sessões de treinamento', 'Trophy', 'milestone', '{"sessions_count": 10}', 50, 'secondary'),
('sessions_50', '50 Sessões', 'Completou 50 sessões de treinamento', 'Award', 'milestone', '{"sessions_count": 50}', 200, 'accent'),
('sessions_100', 'Centurião', 'Impressionante! 100 sessões completadas', 'Crown', 'milestone', '{"sessions_count": 100}', 500, 'accent'),
('score_90_overall', 'Nota de Ouro', 'Alcançou score geral 90+ em uma sessão', 'Star', 'performance', '{"min_overall_score": 90}', 75, 'warning'),
('score_90_opening', 'Mestre da Abertura', 'Score 90+ em Abertura', 'Zap', 'performance', '{"competency": "Abertura", "min_score": 90}', 50, 'primary'),
('score_90_situation', 'Descobridor Expert', 'Score 90+ em Perguntas de Situação', 'Search', 'performance', '{"competency": "Perguntas de Situação", "min_score": 90}', 50, 'primary'),
('score_90_problem', 'Explorador de Problemas', 'Score 90+ em Perguntas de Problema', 'AlertTriangle', 'performance', '{"competency": "Perguntas de Problema", "min_score": 90}', 50, 'primary'),
('score_90_implication', 'Amplificador', 'Score 90+ em Implicação', 'TrendingUp', 'performance', '{"competency": "Perguntas de Implicação", "min_score": 90}', 50, 'primary'),
('score_90_need_payoff', 'Construtor de Valor', 'Score 90+ em Necessidade-Benefício', 'Target', 'performance', '{"competency": "Perguntas de Necessidade-Benefício", "min_score": 90}', 50, 'primary'),
('score_90_objections', 'Domador de Objeções', 'Score 90+ em Tratamento de Objeções', 'Shield', 'performance', '{"competency": "Tratamento de Objeções", "min_score": 90}', 50, 'primary'),
('score_90_closing', 'Fechador Profissional', 'Score 90+ em Fechamento', 'CheckCircle', 'performance', '{"competency": "Fechamento", "min_score": 90}', 50, 'primary'),
('streak_3', 'Consistência', '3 dias consecutivos praticando', 'Flame', 'consistency', '{"streak_days": 3}', 30, 'warning'),
('streak_7', 'Semana Perfeita', '7 dias consecutivos praticando', 'Flame', 'consistency', '{"streak_days": 7}', 100, 'destructive'),
('streak_30', 'Maratonista', '30 dias consecutivos praticando', 'Flame', 'consistency', '{"streak_days": 30}', 500, 'destructive'),
('all_90_plus', 'SPIN Master', 'Score 90+ em todas as 7 competências', 'Award', 'mastery', '{"all_competencies_90": true}', 300, 'accent'),
('perfect_session', 'Sessão Perfeita', 'Score 100 geral em uma sessão', 'Crown', 'mastery', '{"overall_score": 100}', 1000, 'accent')
ON CONFLICT (id) DO NOTHING;

-- Insert competency criteria
INSERT INTO competency_criteria (competency_name, criterion_key, criterion_name, criterion_description, evaluation_guide, weight) VALUES
('Abertura', 'credibilidade', 'Credibilidade Técnica', 'Demonstrou conhecimento técnico e domínio do assunto logo na abertura', 'Verificar menção a cenário de ameaças, regulamentações (LGPD/GDPR), ou casos recentes', 1.0),
('Abertura', 'gancho', 'Uso de Gancho', 'Utilizou evento recente, estatística ou regulamentação como gancho de abertura', 'Identificar uso de notícias, dados de mercado, ou compliance como contexto inicial', 1.0),
('Abertura', 'alinhamento', 'Alinhamento de Expectativas', 'Deixou claro o objetivo da conversa e o que será discutido', 'Verificar se estabeleceu agenda e expectativas mútuas desde o início', 1.0),
('Perguntas de Situação', 'infraestrutura', 'Mapeamento de Infraestrutura', 'Perguntou sobre a infraestrutura tecnológica atual da empresa', 'Questões sobre Cloud/On-premise, número de endpoints, ambientes', 1.0),
('Perguntas de Situação', 'stack_atual', 'Stack de Segurança Atual', 'Investigou quais ferramentas de segurança já estão em uso', 'Perguntas sobre antivírus, firewall, SIEM, EDR existentes', 1.0),
('Perguntas de Situação', 'maturidade', 'Maturidade em Segurança', 'Avaliou o nível de maturidade da empresa em cibersegurança', 'Questões sobre políticas, equipe dedicada, processos estabelecidos', 1.0),
('Perguntas de Situação', 'compliance', 'Contexto de Compliance', 'Perguntou sobre requisitos regulatórios e de conformidade', 'LGPD, ISO 27001, frameworks de segurança adotados', 0.8),
('Perguntas de Problema', 'vulnerabilidades', 'Identificação de Vulnerabilidades', 'Explorou vulnerabilidades e pontos fracos atuais', 'Perguntas sobre incidentes passados, gaps de segurança conhecidos', 1.0),
('Perguntas de Problema', 'conformidade', 'Desafios de Conformidade', 'Investigou dificuldades para manter conformidade regulatória', 'Questões sobre auditorias, penalidades, riscos de não-conformidade', 1.0),
('Perguntas de Problema', 'risco_humano', 'Fator Humano e Risco', 'Abordou o risco humano (phishing, engenharia social, awareness)', 'Perguntas sobre treinamento, cultura de segurança, incidentes internos', 0.9),
('Perguntas de Implicação', 'impacto_negocio', 'Impacto no Negócio', 'Explorou consequências de um incidente no core business', 'Questões sobre downtime, perda de receita, impacto operacional', 1.0),
('Perguntas de Implicação', 'reputacao', 'Risco Reputacional', 'Abordou danos à reputação e confiança dos clientes', 'Perguntas sobre vazamentos, exposição pública, perda de clientes', 1.0),
('Perguntas de Implicação', 'custos', 'Custos e Multas', 'Investigou custos financeiros de incidentes e multas regulatórias', 'LGPD (até 2% do faturamento), custos de remediação, processos legais', 1.0),
('Perguntas de Necessidade-Benefício', 'beneficios', 'Visualização de Benefícios', 'Levou o prospect a articular benefícios de resolver o problema', 'Perguntas que fazem o cliente verbalizar ganhos', 1.0),
('Perguntas de Necessidade-Benefício', 'roi', 'ROI e Valor', 'Explorou retorno sobre investimento e geração de valor', 'Questões sobre economia, produtividade, redução de riscos quantificável', 1.0),
('Perguntas de Necessidade-Benefício', 'visao_futuro', 'Visão de Futuro', 'Criou visão positiva do estado futuro com a solução', 'Perguntas que pintam cenário ideal pós-implementação', 0.9),
('Tratamento de Objeções', 'escuta_ativa', 'Escuta Ativa', 'Demonstrou escuta genuína antes de responder objeções', 'Verificar se reformulou objeção, fez perguntas de clarificação', 1.0),
('Tratamento de Objeções', 'empatia', 'Empatia e Validação', 'Validou preocupações do prospect antes de contra-argumentar', 'Uso de frases como "Entendo sua preocupação"', 1.0),
('Tratamento de Objeções', 'evidencias', 'Uso de Evidências', 'Utilizou dados, casos ou provas sociais para neutralizar objeções', 'Cases de clientes similares, estudos, estatísticas do setor', 1.0),
('Fechamento', 'proximos_passos', 'Próximos Passos Claros', 'Estabeleceu próximos passos concretos e com prazos', 'Agendamento de reunião, envio de proposta, trial, com datas definidas', 1.0),
('Fechamento', 'compromisso', 'Obtenção de Compromisso', 'Conseguiu compromisso explícito do prospect', 'Acordo verbal, aceite de próximo estágio, envolvimento de stakeholders', 1.0),
('Fechamento', 'recapitulacao', 'Recapitulação de Valor', 'Recapitulou benefícios e acordos antes de encerrar', 'Resumo de pain points, soluções discutidas, valor identificado', 0.9)
ON CONFLICT (competency_name, criterion_key) DO NOTHING;

-- Create function for achievements
CREATE OR REPLACE FUNCTION check_and_unlock_achievements(_user_id uuid, _session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sessions_count integer;
  v_overall_score numeric;
  v_competency record;
BEGIN
  SELECT COUNT(*) INTO v_sessions_count
  FROM roleplay_sessions
  WHERE user_id = _user_id AND status = 'completed';

  SELECT overall_score INTO v_overall_score
  FROM roleplay_sessions
  WHERE id = _session_id;

  IF v_sessions_count >= 1 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (_user_id, 'first_session')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF v_sessions_count >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (_user_id, 'sessions_10')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF v_overall_score >= 90 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (_user_id, 'score_90_overall')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF v_overall_score = 100 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (_user_id, 'perfect_session')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
END;
$$;

-- Success message
SELECT 'Schema criado com sucesso!' as status;
