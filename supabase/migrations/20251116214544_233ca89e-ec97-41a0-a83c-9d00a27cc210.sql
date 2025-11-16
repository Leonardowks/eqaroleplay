-- Fase 3: Achievements, Comparador e Features Avançadas

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
COMMENT ON FUNCTION check_and_unlock_achievements IS 'Verifica e desbloqueia achievements baseado na performance da sessão';