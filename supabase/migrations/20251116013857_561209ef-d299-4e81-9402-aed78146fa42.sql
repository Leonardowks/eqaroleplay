-- Limpar sessões órfãs (mais de 1 hora ativas)
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

-- Comentário: Esta função pode ser chamada periodicamente ou manualmente para limpar sessões órfãs