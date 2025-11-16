-- Add new columns to roleplay_sessions for Sprint 1 features
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
COMMENT ON COLUMN roleplay_sessions.executive_summary IS 'Brief executive summary of the session';