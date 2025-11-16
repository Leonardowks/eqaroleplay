-- Fix search_path for cleanup_abandoned_sessions function
ALTER FUNCTION cleanup_abandoned_sessions() SET search_path = public;