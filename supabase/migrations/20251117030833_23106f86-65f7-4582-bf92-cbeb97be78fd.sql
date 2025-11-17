-- Adicionar campos para controle de provider de voz
ALTER TABLE personas 
ADD COLUMN IF NOT EXISTS voice_provider TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS elevenlabs_voice_id TEXT;

-- Comentários para documentação
COMMENT ON COLUMN personas.voice_provider IS 'Provider de TTS: openai ou elevenlabs';
COMMENT ON COLUMN personas.elevenlabs_voice_id IS 'ID da voz do ElevenLabs (se voice_provider = elevenlabs)';