-- Fix search_path for security
ALTER FUNCTION cleanup_abandoned_voice_sessions() SET search_path = public;