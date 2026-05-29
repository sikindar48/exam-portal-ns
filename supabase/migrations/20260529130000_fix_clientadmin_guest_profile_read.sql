-- Drop the old policy
DROP POLICY IF EXISTS "Client admins can read profiles in their client" ON public.profiles;

-- Create the updated policy to allow client admins to read guest profiles in their client
CREATE POLICY "Client admins can read profiles in their client"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'clientadmin')
  AND (
    profiles.client_id = public.get_user_client_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = profiles.id
        AND client_id = public.get_user_client_id(auth.uid())
    )
  )
);
