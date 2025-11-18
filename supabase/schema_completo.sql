-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Create personas table
create table public.personas (
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
alter table public.personas enable row level security;

-- Personas are public (everyone can read)
create policy "Anyone can view personas"
  on public.personas for select
  to authenticated
  using (true);

-- Create roleplay sessions table
create table public.roleplay_sessions (
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
alter table public.roleplay_sessions enable row level security;

-- Sessions policies
create policy "Users can view their own sessions"
  on public.roleplay_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on public.roleplay_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
  on public.roleplay_sessions for update
  using (auth.uid() = user_id);

-- Create session messages table
create table public.session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.roleplay_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'persona')),
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.session_messages enable row level security;

-- Messages policies (users can only see messages from their own sessions)
create policy "Users can view messages from their sessions"
  on public.session_messages for select
  using (
    exists (
      select 1 from public.roleplay_sessions
      where id = session_id and user_id = auth.uid()
    )
  );

create policy "Users can insert messages to their sessions"
  on public.session_messages for insert
  with check (
    exists (
      select 1 from public.roleplay_sessions
      where id = session_id and user_id = auth.uid()
    )
  );

-- Create competency scores table
create table public.competency_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.roleplay_sessions(id) on delete cascade not null,
  competency_name text not null,
  score decimal(3,1) not null check (score >= 0 and score <= 10),
  feedback text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.competency_scores enable row level security;

-- Scores policies
create policy "Users can view scores from their sessions"
  on public.competency_scores for select
  using (
    exists (
      select 1 from public.roleplay_sessions
      where id = session_id and user_id = auth.uid()
    )
  );

create policy "Users can insert scores to their sessions"
  on public.competency_scores for insert
  with check (
    exists (
      select 1 from public.roleplay_sessions
      where id = session_id and user_id = auth.uid()
    )
  );

-- Trigger for updating updated_at on profiles
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Trigger to create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();-- Inserir as personas no banco de dados
INSERT INTO public.personas (id, name, role, company, sector, difficulty, description, personality_traits) VALUES
  (gen_random_uuid(), 'Ricardo Startup', 'Fundador', 'Tech Startup', 'Tecnologia', 'easy', 'Jovem empreendedor, entusiasta de IA, orçamento limitado mas mente aberta', '{"enthusiasm": "high", "openness": "high", "budget_concern": "medium"}'::jsonb),
  (gen_random_uuid(), 'Marina E-commerce', 'Gerente de Operações', 'Loja Online', 'Varejo Digital', 'easy', 'Sobrecarregada com tarefas manuais, busca eficiência imediata', '{"urgency": "high", "technical_knowledge": "medium", "decision_speed": "fast"}'::jsonb),
  (gen_random_uuid(), 'André Pequeno Negócio', 'Proprietário', 'Consultoria', 'Serviços', 'easy', 'Precisa automatizar processos administrativos básicos', '{"practicality": "high", "tech_adoption": "medium", "cost_sensitive": "high"}'::jsonb),
  (gen_random_uuid(), 'Fernanda RH', 'Diretora de Gente', 'Empresa Médio Porte', 'Recursos Humanos', 'medium', 'Quer automatizar recrutamento e onboarding, preocupada com custos', '{"analytical": "high", "risk_averse": "medium", "process_oriented": "high"}'::jsonb),
  (gen_random_uuid(), 'Carlos Industrial', 'Gerente de Produção', 'Indústria', 'Manufatura', 'medium', 'Tradicional, cético com IA, foca em resultados tangíveis', '{"skepticism": "high", "results_focused": "high", "traditional": "high"}'::jsonb),
  (gen_random_uuid(), 'Juliana Marketing', 'CMO', 'Agência Digital', 'Marketing', 'medium', 'Conhece automação mas questiona diferencial da sua solução', '{"knowledge": "high", "competitive": "high", "demanding": "high"}'::jsonb),
  (gen_random_uuid(), 'Dr. Roberto Advogado', 'Sócio', 'Escritório Jurídico', 'Advocacia', 'hard', 'Extremamente preocupado com segurança e compliance, LGPD', '{"security_focused": "very_high", "compliance_strict": "very_high", "detail_oriented": "very_high"}'::jsonb),
  (gen_random_uuid(), 'Patricia CFO', 'Diretora Financeira', 'Holding', 'Financeiro', 'hard', 'Foca intensamente em ROI, payback e métricas financeiras', '{"analytical": "very_high", "roi_focused": "very_high", "data_driven": "very_high"}'::jsonb),
  (gen_random_uuid(), 'Gustavo TI', 'CTO', 'Empresa Enterprise', 'Tecnologia', 'hard', 'Técnico, questiona arquitetura, integrações e escalabilidade', '{"technical": "very_high", "critical_thinking": "very_high", "architecture_focused": "very_high"}'::jsonb)
ON CONFLICT (id) DO NOTHING;-- Limpar sessões órfãs (mais de 1 hora ativas sem conclusão)
UPDATE roleplay_sessions
SET 
  status = 'completed',
  completed_at = started_at + interval '1 hour',
  duration_seconds = 3600
WHERE 
  status = 'active'
  AND started_at < NOW() - interval '1 hour';

-- Atualizar referências de sessões para a primeira persona de cada duplicata
WITH first_personas AS (
  SELECT DISTINCT ON (name, difficulty)
    id as keep_id,
    name,
    difficulty
  FROM personas
  ORDER BY name, difficulty, id
),
duplicate_personas AS (
  SELECT p.id as duplicate_id, fp.keep_id
  FROM personas p
  JOIN first_personas fp ON p.name = fp.name AND p.difficulty = fp.difficulty
  WHERE p.id != fp.keep_id
)
UPDATE roleplay_sessions rs
SET persona_id = dp.keep_id
FROM duplicate_personas dp
WHERE rs.persona_id = dp.duplicate_id;

-- Agora podemos deletar personas duplicadas
DELETE FROM personas p1
WHERE EXISTS (
  SELECT 1 FROM personas p2
  WHERE p1.name = p2.name 
    AND p1.difficulty = p2.difficulty
    AND p1.id > p2.id
);

-- Adicionar constraint de unicidade
ALTER TABLE personas
ADD CONSTRAINT personas_name_difficulty_unique UNIQUE (name, difficulty);

-- Função para auto-cleanup de sessões abandonadas
CREATE OR REPLACE FUNCTION cleanup_abandoned_sessions()
RETURNS void AS $$
BEGIN
  UPDATE roleplay_sessions
  SET 
    status = 'completed',
    completed_at = started_at + interval '30 minutes',
    duration_seconds = 1800
  WHERE 
    status = 'active'
    AND started_at < NOW() - interval '30 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Corrigir função handle_updated_at com search_path seguro
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

-- Corrigir função handle_new_user com search_path já definido (recriar para confirmar)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
$$;-- Corrigir função handle_updated_at com search_path seguro
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

-- Corrigir função handle_new_user com search_path já definido (recriar para confirmar)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
$$;-- Limpar sessões órfãs (mais de 1 hora ativas)
UPDATE roleplay_sessions
SET 
  status = 'completed',
  completed_at = CASE 
    WHEN completed_at IS NULL THEN NOW()
    ELSE completed_at
  END,
  duration_seconds = CASE
    WHEN duration_seconds IS NULL OR duration_seconds = 0 
    THEN EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
    ELSE duration_seconds
  END
WHERE 
  status = 'active' 
  AND method = 'voice'
  AND started_at < NOW() - INTERVAL '1 hour';

-- Função para limpar sessões abandonadas automaticamente
CREATE OR REPLACE FUNCTION cleanup_abandoned_voice_sessions()
RETURNS void AS $$
BEGIN
  UPDATE roleplay_sessions
  SET 
    status = 'completed',
    completed_at = NOW(),
    duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
  WHERE 
    status = 'active' 
    AND method = 'voice'
    AND started_at < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário: Esta função pode ser chamada periodicamente ou manualmente para limpar sessões órfãs-- Fix search_path for security
ALTER FUNCTION cleanup_abandoned_voice_sessions() SET search_path = public;-- Fix search_path for cleanup_abandoned_sessions function
ALTER FUNCTION cleanup_abandoned_sessions() SET search_path = public;-- Sprint 1: Fundação SPIN - Atualizar Schema do Banco

-- Adicionar colunas para SPIN Selling na tabela competency_scores
ALTER TABLE competency_scores 
ADD COLUMN IF NOT EXISTS spin_category TEXT CHECK (spin_category IN ('situation', 'problem', 'implication', 'need_payoff', 'objection_handling', 'closing', 'opening'));

ALTER TABLE competency_scores
ADD COLUMN IF NOT EXISTS sub_scores JSONB;

ALTER TABLE competency_scores
ADD COLUMN IF NOT EXISTS ai_suggestions JSONB;

-- Adicionar campos para personas (contexto de automação IA)
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS pain_points JSONB;

ALTER TABLE personas
ADD COLUMN IF NOT EXISTS objection_patterns JSONB;

ALTER TABLE personas
ADD COLUMN IF NOT EXISTS buying_signals JSONB;

ALTER TABLE personas
ADD COLUMN IF NOT EXISTS automation_context JSONB;

-- Criar tabela de conquistas (achievements)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies para user_achievements
CREATE POLICY "Users can view their own achievements"
ON user_achievements
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements"
ON user_achievements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Criar tabela de insights do usuário (análise de padrões por IA)
CREATE TABLE IF NOT EXISTS user_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies para user_insights
CREATE POLICY "Users can view their own insights"
ON user_insights
FOR SELECT
USING (auth.uid() = user_id);

-- Criar view de rankings avançados
CREATE OR REPLACE VIEW advanced_rankings AS
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

-- Atualizar personas existentes com contexto de automação IA
UPDATE personas 
SET 
  description = 'Fundador de startup tech, entusiasta de IA e automação. Orçamento limitado mas mente aberta. Busca soluções rápidas de implementar que gerem resultado imediato.',
  pain_points = '["Processos manuais atrasam crescimento", "Equipe pequena sobrecarregada", "Falta de dados estruturados para tomar decisões", "Necessidade de escalar sem contratar muito"]',
  objection_patterns = '["É muito caro para startup", "Minha equipe não tem tempo pra implementar", "Preciso ver resultado em 30 dias", "E se mudar de ideia depois?"]',
  buying_signals = '["Pergunta sobre trial gratuito", "Menciona problema urgente específico", "Pede pra falar com time técnico", "Questiona sobre tempo de implementação"]',
  automation_context = '{
    "current_processes": ["CRM manual em planilhas", "Emails de follow-up manuais", "Relatórios semanais em Excel"],
    "team_size": "3-5 pessoas",
    "budget_range": "$200-$1k/mês",
    "decision_factors": ["rapidez", "facilidade", "preço", "suporte"],
    "tech_stack": ["Google Workspace", "Notion", "WhatsApp"]
  }'
WHERE name = 'Ricardo Startup';

UPDATE personas
SET
  description = 'Gerente de operações de loja online, sobrecarregada com tarefas repetitivas. Busca eficiência imediata e redução de erros. Pouco conhecimento técnico mas sabe o que quer.',
  pain_points = '["Gestão de estoque manual com erros frequentes", "Atendimento ao cliente lento", "Processos de envio desorganizados", "Falta visibilidade de métricas em tempo real"]',
  objection_patterns = '["Não tenho tempo pra implementar agora (Black Friday chegando)", "Meu time não sabe usar IA", "E se quebrar algo e perder vendas?", "Integra com Shopify/Mercado Livre?"]',
  buying_signals = '["Pergunta sobre integração com plataforma atual", "Menciona época crítica (Black Friday, Natal)", "Pede demo específica do setor", "Pergunta sobre suporte emergencial"]',
  automation_context = '{
    "current_processes": ["Atualização manual de estoque 3x/dia", "Respostas padronizadas copiadas/coladas", "Rastreamento de pedidos em planilha"],
    "team_size": "2-3 pessoas",
    "budget_range": "$300-$2k/mês",
    "decision_factors": ["integração fácil", "não quebrar vendas", "suporte rápido"],
    "tech_stack": ["Shopify", "Mercado Livre", "WhatsApp Business"]
  }'
WHERE name = 'Marina E-commerce';

UPDATE personas
SET
  description = 'Diretora de Gente e Gestão em empresa médio porte. Quer automatizar recrutamento e onboarding, mas preocupada com custo e humanização do processo. Precisa de ROI claro.',
  pain_points = '["Triagem de CVs consome 40h/mês", "Onboarding manual e inconsistente", "Turnover alto por falta de fit cultural", "Processos de RH não escaláveis"]',
  objection_patterns = '["IA pode ser discriminatória na seleção?", "Perderemos o toque humano?", "Quanto custa por funcionário?", "Preciso aprovar com diretoria, tem case de empresa similar?"]',
  buying_signals = '["Pergunta sobre compliance (LGPD)", "Menciona dor específica (ex: 500 CVs/semana)", "Questiona sobre personalização", "Pede apresentação para board"]',
  automation_context = '{
    "current_processes": ["Triagem manual de CVs", "Agendamento manual de entrevistas", "Onboarding via PDFs/emails"],
    "team_size": "5-8 pessoas",
    "budget_range": "$2k-$10k/mês",
    "decision_factors": ["compliance LGPD", "humanização", "ROI comprovado", "integração com ATS"],
    "tech_stack": ["Gupy", "Google Workspace", "Excel"]
  }'
WHERE name = 'Fernanda RH';

UPDATE personas
SET
  description = 'Gerente de produção em indústria tradicional. Cético com tecnologia ("já tentamos antes e não deu certo"). Foca em resultados tangíveis, redução de custos e aumento de produtividade.',
  pain_points = '["Paradas não planejadas custam R$ 50k/dia", "Planejamento de produção em planilhas desatualizadas", "Falta de previsibilidade", "Desperdício de matéria-prima por erro humano"]',
  objection_patterns = '["Já tentamos automação e falhou", "Chão de fábrica não aceita mudança", "Implementação vai parar produção?", "E se der erro no meio do turno?"]',
  buying_signals = '["Menciona custo específico de parada", "Pergunta sobre pilot em uma linha", "Questiona sobre treinamento da equipe", "Pede visita técnica"]',
  automation_context = '{
    "current_processes": ["Ordens de produção em papel", "Controle de estoque manual", "Manutenção reativa"],
    "team_size": "50-100 operadores",
    "budget_range": "$5k-$20k/mês",
    "decision_factors": ["ROI < 12 meses", "não parar produção", "treinamento fácil", "suporte 24/7"],
    "tech_stack": ["Excel", "ERP legado", "Sistemas isolados"]
  }'
WHERE name = 'Carlos Industrial';

UPDATE personas
SET
  description = 'CMO de agência digital, conhece ferramentas de automação mas questiona diferencial. Busca resultados mensuráveis em campanhas e relatórios automatizados para clientes.',
  pain_points = '["Relatórios manuais consomem 20h/semana", "Dificuldade de escalar atendimento", "Personalização de campanhas é manual", "Falta integração entre ferramentas"]',
  objection_patterns = '["Já uso Zapier/Make, qual a diferença?", "Como garante que IA não vai gerar conteúdo genérico?", "E a personalização por cliente?", "Preço por cliente ou flat?"]',
  buying_signals = '["Pergunta sobre integrações (RD, HubSpot)", "Menciona número de clientes", "Questiona sobre white-label", "Pede case de agência"]',
  automation_context = '{
    "current_processes": ["Criação manual de relatórios", "Copy de ads manualmente", "Segmentação básica"],
    "team_size": "10-20 pessoas",
    "budget_range": "$3k-$15k/mês",
    "decision_factors": ["integrações", "escalabilidade", "white-label", "ROI por cliente"],
    "tech_stack": ["RD Station", "Meta Ads", "Google Analytics", "Notion"]
  }'
WHERE name = 'Juliana Marketing';

-- Adicionar 2 novas personas
INSERT INTO personas (name, role, company, sector, difficulty, description, pain_points, objection_patterns, buying_signals, automation_context)
VALUES 
(
  'Paulo CFO',
  'Chief Financial Officer',
  'Empresa Corporativa',
  'Serviços Financeiros',
  'hard',
  'CFO analítico e extremamente orientado a números. Exige ROI detalhado, benchmarks de mercado e aprovação de comitê. Decisão lenta mas ticket alto.',
  '["Fechamento financeiro leva 15 dias", "Falta de previsibilidade de fluxo de caixa", "Conciliação bancária manual propensa a erros", "Relatórios gerenciais desatualizados"]',
  '["Preciso ver payback < 18 meses", "Como garante segurança dos dados financeiros?", "Precisa integrar com SAP/Oracle", "Quanto custa manutenção após implementação?"]',
  '["Solicita planilha de ROI detalhada", "Pergunta sobre compliance SOX/SOC2", "Pede referências de CFOs de empresas similares", "Menciona budget já aprovado"]',
  '{
    "current_processes": ["Fechamento em Excel com 50+ abas", "Conciliação manual", "FP&A em PowerPoint"],
    "team_size": "20-30 pessoas",
    "budget_range": "$20k-$100k/mês",
    "decision_factors": ["ROI comprovado", "segurança", "escalabilidade", "suporte enterprise"],
    "tech_stack": ["SAP", "Oracle", "Excel avançado"]
  }'
),
(
  'Beatriz Atendimento',
  'Head de Customer Success',
  'SaaS B2B',
  'Tecnologia',
  'easy',
  'Líder de CS em SaaS, sobrecarregada com tickets repetitivos. Busca chatbot inteligente e automação de onboarding. Rápida na decisão se ver fit claro.',
  '["80% dos tickets são perguntas simples repetidas", "Onboarding lento impacta churn", "Time não escala", "Falta proatividade com clientes em risco"]',
  '["Chatbot vai dar respostas ruins e piorar NPS?", "Quanto tempo pra treinar a IA?", "Integra com Intercom/Zendesk?", "E se cliente preferir humano?"]',
  '["Pergunta sobre NLP em português", "Menciona volume de tickets (ex: 1000/mês)", "Questiona sobre handoff humano", "Pede trial de 14 dias"]',
  '{
    "current_processes": ["Respostas manuais via Intercom", "Onboarding via Zoom 1-on-1", "Follow-ups manuais"],
    "team_size": "5-10 pessoas",
    "budget_range": "$1k-$5k/mês",
    "decision_factors": ["redução de tickets", "melhoria de NPS", "facilidade", "integração"],
    "tech_stack": ["Intercom", "Zoom", "Notion"]
  }'
)
ON CONFLICT DO NOTHING;-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
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
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin view for user management
CREATE OR REPLACE VIEW public.admin_users_view AS
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

-- RLS for admin view
CREATE POLICY "Admins can view user stats"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR public.has_role(auth.uid(), 'admin')
);

-- Allow admins to view all sessions
CREATE POLICY "Admins can view all sessions"
ON public.roleplay_sessions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
);

-- Allow admins to view all competency scores
CREATE POLICY "Admins can view all scores"
ON public.competency_scores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM roleplay_sessions 
    WHERE roleplay_sessions.id = competency_scores.session_id 
    AND roleplay_sessions.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
);

-- Allow admins to view all session messages
CREATE POLICY "Admins can view all messages"
ON public.session_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM roleplay_sessions 
    WHERE roleplay_sessions.id = session_messages.session_id 
    AND roleplay_sessions.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
);-- Adicionar políticas RLS de DELETE para admins

-- Permitir admins deletarem session_messages
CREATE POLICY "Admins can delete messages"
ON session_messages FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Permitir admins deletarem competency_scores
CREATE POLICY "Admins can delete scores"
ON competency_scores FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Permitir admins deletarem user_achievements
CREATE POLICY "Admins can delete achievements"
ON user_achievements FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Permitir admins deletarem user_insights
CREATE POLICY "Admins can delete insights"
ON user_insights FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Permitir admins deletarem roleplay_sessions
CREATE POLICY "Admins can delete sessions"
ON roleplay_sessions FOR DELETE
USING (has_role(auth.uid(), 'admin'));-- Add new columns to roleplay_sessions for Sprint 1 features
ALTER TABLE roleplay_sessions
ADD COLUMN IF NOT EXISTS voice_metrics JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS highlights TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recommendations TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS executive_summary TEXT DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_roleplay_sessions_user_completed 
ON roleplay_sessions(user_id, completed_at DESC) 
WHERE status = 'completed';

COMMENT ON COLUMN roleplay_sessions.voice_metrics IS 'Vocal analysis metrics: talk_listen_ratio, filler_words_per_minute, speech_speed_wpm, longest_monologue_seconds';
COMMENT ON COLUMN roleplay_sessions.highlights IS 'Key positive moments from the session';
COMMENT ON COLUMN roleplay_sessions.recommendations IS 'Actionable recommendations for improvement';
COMMENT ON COLUMN roleplay_sessions.executive_summary IS 'Brief executive summary of the session';-- Add sub_scores_feedback column to competency_scores table for Sprint 3
ALTER TABLE competency_scores
ADD COLUMN IF NOT EXISTS sub_scores_feedback JSONB DEFAULT NULL;

COMMENT ON COLUMN competency_scores.sub_scores_feedback IS 'Detailed feedback for each sub-score criterion with descriptions';-- Add sub_scores_feedback column to competency_scores table for Sprint 3
ALTER TABLE competency_scores
ADD COLUMN IF NOT EXISTS sub_scores_feedback JSONB DEFAULT NULL;

COMMENT ON COLUMN competency_scores.sub_scores_feedback IS 'Detailed feedback for each sub-score criterion with descriptions';-- Fase 1: Sistema de Aprovação/Reprovação + Critérios Detalhados

-- 1. Adicionar campo de aprovações de critérios aos scores existentes
ALTER TABLE competency_scores 
ADD COLUMN IF NOT EXISTS criterion_approvals jsonb DEFAULT '{}';

-- 2. Criar tabela de critérios pré-definidos por competência
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

-- 3. Popular com critérios base para cada competência SPIN

-- ABERTURA (Opening)
INSERT INTO competency_criteria (competency_name, criterion_key, criterion_name, criterion_description, evaluation_guide, weight) VALUES
('Abertura', 'credibilidade', 'Credibilidade Técnica', 'Demonstrou conhecimento técnico e domínio do assunto logo na abertura', 'Verificar menção a cenário de ameaças, regulamentações (LGPD/GDPR), ou casos recentes', 1.0),
('Abertura', 'gancho', 'Uso de Gancho', 'Utilizou evento recente, estatística ou regulamentação como gancho de abertura', 'Identificar uso de notícias, dados de mercado, ou compliance como contexto inicial', 1.0),
('Abertura', 'alinhamento', 'Alinhamento de Expectativas', 'Deixou claro o objetivo da conversa e o que será discutido', 'Verificar se estabeleceu agenda e expectativas mútuas desde o início', 1.0);

-- SITUAÇÃO (Situation Questions)
INSERT INTO competency_criteria (competency_name, criterion_key, criterion_name, criterion_description, evaluation_guide, weight) VALUES
('Perguntas de Situação', 'infraestrutura', 'Mapeamento de Infraestrutura', 'Perguntou sobre a infraestrutura tecnológica atual da empresa', 'Questões sobre Cloud/On-premise, número de endpoints, ambientes', 1.0),
('Perguntas de Situação', 'stack_atual', 'Stack de Segurança Atual', 'Investigou quais ferramentas de segurança já estão em uso', 'Perguntas sobre antivírus, firewall, SIEM, EDR existentes', 1.0),
('Perguntas de Situação', 'maturidade', 'Maturidade em Segurança', 'Avaliou o nível de maturidade da empresa em cibersegurança', 'Questões sobre políticas, equipe dedicada, processos estabelecidos', 1.0),
('Perguntas de Situação', 'compliance', 'Contexto de Compliance', 'Perguntou sobre requisitos regulatórios e de conformidade', 'LGPD, ISO 27001, frameworks de segurança adotados', 0.8);

-- PROBLEMA (Problem Questions)
INSERT INTO competency_criteria (competency_name, criterion_key, criterion_name, criterion_description, evaluation_guide, weight) VALUES
('Perguntas de Problema', 'vulnerabilidades', 'Identificação de Vulnerabilidades', 'Explorou vulnerabilidades e pontos fracos atuais', 'Perguntas sobre incidentes passados, gaps de segurança conhecidos', 1.0),
('Perguntas de Problema', 'conformidade', 'Desafios de Conformidade', 'Investigou dificuldades para manter conformidade regulatória', 'Questões sobre auditorias, penalidades, riscos de não-conformidade', 1.0),
('Perguntas de Problema', 'risco_humano', 'Fator Humano e Risco', 'Abordou o risco humano (phishing, engenharia social, awareness)', 'Perguntas sobre treinamento, cultura de segurança, incidentes internos', 0.9);

-- IMPLICAÇÃO (Implication Questions)
INSERT INTO competency_criteria (competency_name, criterion_key, criterion_name, criterion_description, evaluation_guide, weight) VALUES
('Perguntas de Implicação', 'impacto_negocio', 'Impacto no Negócio', 'Explorou consequências de um incidente no core business', 'Questões sobre downtime, perda de receita, impacto operacional', 1.0),
('Perguntas de Implicação', 'reputacao', 'Risco Reputacional', 'Abordou danos à reputação e confiança dos clientes', 'Perguntas sobre vazamentos, exposição pública, perda de clientes', 1.0),
('Perguntas de Implicação', 'custos', 'Custos e Multas', 'Investigou custos financeiros de incidentes e multas regulatórias', 'LGPD (até 2% do faturamento), custos de remediação, processos legais', 1.0);

-- NECESSIDADE-BENEFÍCIO (Need-Payoff Questions)
INSERT INTO competency_criteria (competency_name, criterion_key, criterion_name, criterion_description, evaluation_guide, weight) VALUES
('Perguntas de Necessidade-Benefício', 'beneficios', 'Visualização de Benefícios', 'Levou o prospect a articular benefícios de resolver o problema', 'Perguntas que fazem o cliente verbalizar ganhos ("Como seria se...")', 1.0),
('Perguntas de Necessidade-Benefício', 'roi', 'ROI e Valor', 'Explorou retorno sobre investimento e geração de valor', 'Questões sobre economia, produtividade, redução de riscos quantificável', 1.0),
('Perguntas de Necessidade-Benefício', 'visao_futuro', 'Visão de Futuro', 'Criou visão positiva do estado futuro com a solução', 'Perguntas que pintam cenário ideal pós-implementação', 0.9);

-- TRATAMENTO DE OBJEÇÕES (Objection Handling)
INSERT INTO competency_criteria (competency_name, criterion_key, criterion_name, criterion_description, evaluation_guide, weight) VALUES
('Tratamento de Objeções', 'escuta_ativa', 'Escuta Ativa', 'Demonstrou escuta genuína antes de responder objeções', 'Verificar se reformulou objeção, fez perguntas de clarificação', 1.0),
('Tratamento de Objeções', 'empatia', 'Empatia e Validação', 'Validou preocupações do prospect antes de contra-argumentar', 'Uso de frases como "Entendo sua preocupação", "Faz sentido"', 1.0),
('Tratamento de Objeções', 'evidencias', 'Uso de Evidências', 'Utilizou dados, casos ou provas sociais para neutralizar objeções', 'Cases de clientes similares, estudos, estatísticas do setor', 1.0);

-- FECHAMENTO (Closing)
INSERT INTO competency_criteria (competency_name, criterion_key, criterion_name, criterion_description, evaluation_guide, weight) VALUES
('Fechamento', 'proximos_passos', 'Próximos Passos Claros', 'Estabeleceu próximos passos concretos e com prazos', 'Agendamento de reunião, envio de proposta, trial, com datas definidas', 1.0),
('Fechamento', 'compromisso', 'Obtenção de Compromisso', 'Conseguiu compromisso explícito do prospect', 'Acordo verbal, aceite de próximo estágio, envolvimento de stakeholders', 1.0),
('Fechamento', 'recapitulacao', 'Recapitulação de Valor', 'Recapitulou benefícios e acordos antes de encerrar', 'Resumo de pain points, soluções discutidas, valor identificado', 0.9);

-- 4. Criar índice para performance em queries por competência
CREATE INDEX IF NOT EXISTS idx_competency_criteria_competency 
ON competency_criteria(competency_name);

-- 5. Habilitar RLS na nova tabela
ALTER TABLE competency_criteria ENABLE ROW LEVEL SECURITY;

-- 6. Criar política para permitir leitura pública dos critérios
CREATE POLICY "Anyone can view competency criteria"
ON competency_criteria FOR SELECT
USING (true);

-- 7. Comentários para documentação
COMMENT ON TABLE competency_criteria IS 'Critérios detalhados de avaliação para cada competência SPIN Selling';
COMMENT ON COLUMN competency_scores.criterion_approvals IS 'Status de aprovação/reprovação por critério específico (approved/rejected/neutral)';
COMMENT ON COLUMN competency_criteria.evaluation_guide IS 'Guia para IA avaliar este critério específico';
COMMENT ON COLUMN competency_criteria.weight IS 'Peso do critério no cálculo do score da competência (padrão: 1.0)';-- Fase 2: Sistema de Recomendações Estruturadas

-- 1. Criar tabela de recomendações estruturadas
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
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_action_items CHECK (jsonb_typeof(action_items) = 'array')
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_session_recommendations_session 
ON session_recommendations(session_id);

CREATE INDEX IF NOT EXISTS idx_session_recommendations_priority 
ON session_recommendations(priority);

CREATE INDEX IF NOT EXISTS idx_session_recommendations_type 
ON session_recommendations(recommendation_type);

-- 3. Habilitar RLS
ALTER TABLE session_recommendations ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS
CREATE POLICY "Users can view recommendations from their sessions"
ON session_recommendations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM roleplay_sessions
    WHERE roleplay_sessions.id = session_recommendations.session_id
    AND roleplay_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert recommendations"
ON session_recommendations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM roleplay_sessions
    WHERE roleplay_sessions.id = session_recommendations.session_id
    AND roleplay_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all recommendations"
ON session_recommendations FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete recommendations"
ON session_recommendations FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Comentários para documentação
COMMENT ON TABLE session_recommendations IS 'Recomendações estruturadas e priorizadas para melhoria de performance em vendas';
COMMENT ON COLUMN session_recommendations.recommendation_type IS 'Tipo: tactical (ação imediata), strategic (planejamento médio prazo), behavioral (mudança de hábito)';
COMMENT ON COLUMN session_recommendations.priority IS 'Prioridade: high (crítico), medium (importante), low (opcional)';
COMMENT ON COLUMN session_recommendations.action_items IS 'Array de ações específicas a serem tomadas';
COMMENT ON COLUMN session_recommendations.expected_impact IS 'Impacto esperado na performance (ex: "+15% em fechamento")';
COMMENT ON COLUMN session_recommendations.time_to_implement IS 'Tempo estimado para implementação (ex: "1 semana", "imediato")';-- Fase 3: Achievements, Comparador e Features Avançadas

-- 1. Popular tabela user_achievements com achievements pré-definidos
-- Verificar se já existem dados antes de insertar

-- 2. Criar tabela de definições de achievements
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

-- 3. Popular achievements pré-definidos
INSERT INTO achievement_definitions (id, name, description, icon, category, criteria, reward_points, badge_color) VALUES
-- Milestones
('first_session', 'Primeira Sessão', 'Completou sua primeira sessão de roleplay', 'Rocket', 'milestone', '{"sessions_count": 1}', 10, 'primary'),
('sessions_10', '10 Sessões', 'Completou 10 sessões de treinamento', 'Trophy', 'milestone', '{"sessions_count": 10}', 50, 'secondary'),
('sessions_50', '50 Sessões', 'Completou 50 sessões de treinamento', 'Award', 'milestone', '{"sessions_count": 50}', 200, 'accent'),
('sessions_100', 'Centurião', 'Impressionante! 100 sessões completadas', 'Crown', 'milestone', '{"sessions_count": 100}', 500, 'accent'),

-- Performance
('score_90_overall', 'Nota de Ouro', 'Alcançou score geral 90+ em uma sessão', 'Star', 'performance', '{"min_overall_score": 90}', 75, 'warning'),
('score_90_opening', 'Mestre da Abertura', 'Score 90+ em Abertura', 'Zap', 'performance', '{"competency": "Abertura", "min_score": 90}', 50, 'primary'),
('score_90_situation', 'Descobridor Expert', 'Score 90+ em Perguntas de Situação', 'Search', 'performance', '{"competency": "Perguntas de Situação", "min_score": 90}', 50, 'primary'),
('score_90_problem', 'Explorador de Problemas', 'Score 90+ em Perguntas de Problema', 'AlertTriangle', 'performance', '{"competency": "Perguntas de Problema", "min_score": 90}', 50, 'primary'),
('score_90_implication', 'Amplificador', 'Score 90+ em Implicação', 'TrendingUp', 'performance', '{"competency": "Perguntas de Implicação", "min_score": 90}', 50, 'primary'),
('score_90_need_payoff', 'Construtor de Valor', 'Score 90+ em Necessidade-Benefício', 'Target', 'performance', '{"competency": "Perguntas de Necessidade-Benefício", "min_score": 90}', 50, 'primary'),
('score_90_objections', 'Domador de Objeções', 'Score 90+ em Tratamento de Objeções', 'Shield', 'performance', '{"competency": "Tratamento de Objeções", "min_score": 90}', 50, 'primary'),
('score_90_closing', 'Fechador Profissional', 'Score 90+ em Fechamento', 'CheckCircle', 'performance', '{"competency": "Fechamento", "min_score": 90}', 50, 'primary'),

-- Consistency
('streak_3', 'Consistência', '3 dias consecutivos praticando', 'Flame', 'consistency', '{"streak_days": 3}', 30, 'warning'),
('streak_7', 'Semana Perfeita', '7 dias consecutivos praticando', 'Flame', 'consistency', '{"streak_days": 7}', 100, 'destructive'),
('streak_30', 'Maratonista', '30 dias consecutivos praticando', 'Flame', 'consistency', '{"streak_days": 30}', 500, 'destructive'),

-- Mastery
('all_90_plus', 'SPIN Master', 'Score 90+ em todas as 7 competências', 'Award', 'mastery', '{"all_competencies_90": true}', 300, 'accent'),
('perfect_session', 'Sessão Perfeita', 'Score 100 geral em uma sessão', 'Crown', 'mastery', '{"overall_score": 100}', 1000, 'accent')
ON CONFLICT (id) DO NOTHING;

-- 4. Criar função para verificar e desbloquear achievements
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
  -- Contar sessões completadas
  SELECT COUNT(*) INTO v_sessions_count
  FROM roleplay_sessions
  WHERE user_id = _user_id AND status = 'completed';

  -- Obter score da sessão atual
  SELECT overall_score INTO v_overall_score
  FROM roleplay_sessions
  WHERE id = _session_id;

  -- Achievement: Primeira sessão
  IF v_sessions_count >= 1 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (_user_id, 'first_session')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Achievement: 10, 50, 100 sessões
  IF v_sessions_count >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (_user_id, 'sessions_10')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF v_sessions_count >= 50 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (_user_id, 'sessions_50')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  IF v_sessions_count >= 100 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (_user_id, 'sessions_100')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Achievement: Score 90+ geral
  IF v_overall_score >= 90 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (_user_id, 'score_90_overall')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Achievement: Score 100 (sessão perfeita)
  IF v_overall_score = 100 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (_user_id, 'perfect_session')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Verificar achievements por competência (score 90+)
  FOR v_competency IN 
    SELECT competency_name, score
    FROM competency_scores
    WHERE session_id = _session_id AND score >= 9 -- 9 em escala 0-10 = 90 em 0-100
  LOOP
    -- Mapear competências para achievement IDs
    IF v_competency.competency_name = 'Abertura' THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (_user_id, 'score_90_opening')
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    ELSIF v_competency.competency_name = 'Perguntas de Situação' THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (_user_id, 'score_90_situation')
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    ELSIF v_competency.competency_name = 'Perguntas de Problema' THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (_user_id, 'score_90_problem')
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    ELSIF v_competency.competency_name = 'Perguntas de Implicação' THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (_user_id, 'score_90_implication')
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    ELSIF v_competency.competency_name = 'Perguntas de Necessidade-Benefício' THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (_user_id, 'score_90_need_payoff')
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    ELSIF v_competency.competency_name = 'Tratamento de Objeções' THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (_user_id, 'score_90_objections')
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    ELSIF v_competency.competency_name = 'Fechamento' THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (_user_id, 'score_90_closing')
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Verificar SPIN Master (todas competências 90+)
  IF (SELECT COUNT(*) FROM competency_scores WHERE session_id = _session_id AND score >= 9) = 7 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (_user_id, 'all_90_plus')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
END;
$$;

-- 5. Habilitar RLS na tabela de definições
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;

-- 6. Permitir leitura pública das definições
CREATE POLICY "Anyone can view achievement definitions"
ON achievement_definitions FOR SELECT
USING (true);

-- 7. Comentários
COMMENT ON TABLE achievement_definitions IS 'Definições dos achievements disponíveis no sistema';
COMMENT ON FUNCTION check_and_unlock_achievements IS 'Verifica e desbloqueia achievements baseado na performance da sessão';-- Corrigir constraint da tabela session_messages para aceitar 'assistant'
-- Isso resolve o erro de salvamento de mensagens do assistente

-- Remover constraint antigo
ALTER TABLE session_messages 
DROP CONSTRAINT IF EXISTS session_messages_role_check;

-- Adicionar novo constraint que aceita 'user', 'persona' e 'assistant'
ALTER TABLE session_messages 
ADD CONSTRAINT session_messages_role_check 
CHECK (role IN ('user', 'persona', 'assistant'));-- Create table for session quality metrics
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

-- Enable RLS
ALTER TABLE public.session_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for session quality metrics
CREATE POLICY "Users can view their own session quality metrics"
ON public.session_quality_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.roleplay_sessions
    WHERE roleplay_sessions.id = session_quality_metrics.session_id
    AND roleplay_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own session quality metrics"
ON public.session_quality_metrics
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roleplay_sessions
    WHERE roleplay_sessions.id = session_quality_metrics.session_id
    AND roleplay_sessions.user_id = auth.uid()
  )
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_session_quality_metrics_session_id 
ON public.session_quality_metrics(session_id);

CREATE INDEX IF NOT EXISTS idx_session_quality_metrics_created_at 
ON public.session_quality_metrics(created_at DESC);-- Adicionar campos para controle de provider de voz
ALTER TABLE personas 
ADD COLUMN IF NOT EXISTS voice_provider TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS elevenlabs_voice_id TEXT;

-- Comentários para documentação
COMMENT ON COLUMN personas.voice_provider IS 'Provider de TTS: openai ou elevenlabs';
COMMENT ON COLUMN personas.elevenlabs_voice_id IS 'ID da voz do ElevenLabs (se voice_provider = elevenlabs)';