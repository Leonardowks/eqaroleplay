-- Sprint 1: Fundação SPIN - Atualizar Schema do Banco

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
ON CONFLICT DO NOTHING;