-- Fix: Allow clientadmin to read user_roles for students in their client.
-- Previously clientadmin had no policy to read other users' roles,
-- so fetchStudents returned 0 results even though students existed.

CREATE POLICY "Client admins can view roles in their client"
ON public.user_roles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'clientadmin')
  AND client_id = public.get_user_client_id(auth.uid())
);
