
CREATE OR REPLACE FUNCTION public.validate_org_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role NOT IN ('owner', 'admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be owner, admin, or member.', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;
