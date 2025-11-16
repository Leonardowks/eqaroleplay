-- Fase 2: Sistema de Recomendações Estruturadas

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
COMMENT ON COLUMN session_recommendations.time_to_implement IS 'Tempo estimado para implementação (ex: "1 semana", "imediato")';