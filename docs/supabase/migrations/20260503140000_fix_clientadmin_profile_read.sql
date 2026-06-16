-- Fix: Allow clientadmin to read profiles of users in their client
-- regardless of whether profiles.client_id is set.
-- The existing policy requires client_id match which fails for students
-- whose profiles.client_id may be null.

DROP POLICY IF EXISTS "Client admins can manage profiles in their client" ON public.profiles;

-- Split into separate read and write policies for clarity

-- READ: clientadmin can see any profile whose user_id appears in their client's user_roles
CREATE POLICY "Client admins can read profiles in their client"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'clientadmin')
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = profiles.id
      AND client_id = public.get_user_client_id(auth.uid())
  )
);

-- WRITE: clientadmin can insert/update/delete profiles where client_id matches
CREATE POLICY "Client admins can write profiles in their client"
ON public.profiles
FOR ALL
USING (
  public.has_role(auth.uid(), 'clientadmin')
  AND client_id = public.get_user_client_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'clientadmin')
  AND client_id = public.get_user_client_id(auth.uid())
);
