-- Create table for session quality metrics
CREATE TABLE IF NOT EXISTS public.session_quality_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.roleplay_sessions(id) ON DELETE CASCADE,
  avg_latency_ms INTEGER,
  total_gaps INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  audio_system_used TEXT CHECK (audio_system_used IN ('legacy', 'enhanced')),
  buffer_health_avg TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for session quality metrics
CREATE POLICY "Users can view their own session quality metrics"
ON public.session_quality_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.roleplay_sessions
    WHERE roleplay_sessions.id = session_quality_metrics.session_id
    AND roleplay_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own session quality metrics"
ON public.session_quality_metrics
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roleplay_sessions
    WHERE roleplay_sessions.id = session_quality_metrics.session_id
    AND roleplay_sessions.user_id = auth.uid()
  )
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_session_quality_metrics_session_id 
ON public.session_quality_metrics(session_id);

CREATE INDEX IF NOT EXISTS idx_session_quality_metrics_created_at 
ON public.session_quality_metrics(created_at DESC);