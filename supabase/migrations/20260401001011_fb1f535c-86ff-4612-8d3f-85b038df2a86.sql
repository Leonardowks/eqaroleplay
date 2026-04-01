-- Function to check superadmin role (uses text cast to work around enum commit requirement)
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'superadmin'
  )
$$;

-- Allow superadmins to view all organizations
CREATE POLICY "Superadmins can view all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.is_superadmin(auth.uid()));

-- Allow superadmins to update any organization
CREATE POLICY "Superadmins can update all organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.is_superadmin(auth.uid()));
