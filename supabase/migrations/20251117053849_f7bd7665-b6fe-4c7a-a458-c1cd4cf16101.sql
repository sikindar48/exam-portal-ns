-- Allow unauthenticated users to view active clients for signup
CREATE POLICY "Anyone can view active clients"
ON public.clients
FOR SELECT
TO anon
USING (active_status = true);