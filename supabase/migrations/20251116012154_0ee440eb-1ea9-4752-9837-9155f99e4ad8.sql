-- Limpar sessões órfãs (mais de 1 hora ativas sem conclusão)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;