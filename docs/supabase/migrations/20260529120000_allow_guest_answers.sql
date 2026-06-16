-- Allow guests (anon users) to manage their profiles, attempts, and attempt_answers
-- 1. profiles RLS policies
DROP POLICY IF EXISTS "Guests can manage their own profiles" ON public.profiles;
CREATE POLICY "Guests can manage their own profiles" ON public.profiles
  FOR ALL TO anon
  USING (name LIKE 'GUEST:%');

-- 2. attempts RLS policies
DROP POLICY IF EXISTS "Guests can manage attempts for public tests" ON public.attempts;
CREATE POLICY "Guests can manage attempts for public tests" ON public.attempts
  FOR ALL TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_id AND t.public_link_enabled = true
    )
  );

-- 3. attempt_answers RLS policies
DROP POLICY IF EXISTS "Guests can manage their own attempt answers" ON public.attempt_answers;
CREATE POLICY "Guests can manage their own attempt answers" ON public.attempt_answers
  FOR ALL TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.attempts a
      JOIN public.tests t ON t.id = a.test_id
      WHERE a.id = attempt_id AND t.public_link_enabled = true
    )
  );
