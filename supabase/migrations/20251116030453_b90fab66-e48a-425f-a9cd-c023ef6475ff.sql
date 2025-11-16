-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin view for user management
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.created_at,
  COALESCE(
    (SELECT jsonb_agg(role) FROM user_roles WHERE user_id = p.id),
    '[]'::jsonb
  ) as roles,
  COUNT(DISTINCT rs.id) as total_sessions,
  AVG(rs.overall_score) as avg_score,
  MAX(rs.completed_at) as last_activity
FROM profiles p
LEFT JOIN roleplay_sessions rs ON rs.user_id = p.id AND rs.status = 'completed'
GROUP BY p.id, p.full_name, p.avatar_url, p.created_at;

-- RLS for admin view
CREATE POLICY "Admins can view user stats"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR public.has_role(auth.uid(), 'admin')
);

-- Allow admins to view all sessions
CREATE POLICY "Admins can view all sessions"
ON public.roleplay_sessions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
);

-- Allow admins to view all competency scores
CREATE POLICY "Admins can view all scores"
ON public.competency_scores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM roleplay_sessions 
    WHERE roleplay_sessions.id = competency_scores.session_id 
    AND roleplay_sessions.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
);

-- Allow admins to view all session messages
CREATE POLICY "Admins can view all messages"
ON public.session_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM roleplay_sessions 
    WHERE roleplay_sessions.id = session_messages.session_id 
    AND roleplay_sessions.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
);