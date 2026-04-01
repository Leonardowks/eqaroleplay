
-- Create invitations table
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  personal_message text,
  invited_by uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint on token
CREATE UNIQUE INDEX idx_invitations_token ON public.invitations(token);

-- Index for quick lookup by email+org
CREATE INDEX idx_invitations_email_org ON public.invitations(email, organization_id);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Admins can view invitations for their org
CREATE POLICY "Admins can view invitations"
ON public.invitations FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_superadmin(auth.uid()));

-- Admins can create invitations
CREATE POLICY "Admins can insert invitations"
ON public.invitations FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_superadmin(auth.uid()));

-- Admins can update invitations (mark accepted)
CREATE POLICY "Admins can update invitations"
ON public.invitations FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_superadmin(auth.uid()));

-- Public can read invitations by token (for join page - anon access)
CREATE POLICY "Anyone can read invitation by token"
ON public.invitations FOR SELECT TO anon
USING (true);

-- Anon can update invitation (to mark accepted)
CREATE POLICY "Anon can accept invitations"
ON public.invitations FOR UPDATE TO anon
USING (accepted_at IS NULL AND expires_at > now());
