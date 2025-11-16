-- Fase 1: Sistema de Aprovação/Reprovação + Critérios Detalhados

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
COMMENT ON COLUMN competency_criteria.weight IS 'Peso do critério no cálculo do score da competência (padrão: 1.0)';