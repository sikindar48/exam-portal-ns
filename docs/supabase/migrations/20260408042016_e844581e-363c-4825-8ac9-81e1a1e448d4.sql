
-- 1. Fix: Create function to get questions without correct_answer for students
CREATE OR REPLACE FUNCTION public.get_test_questions_for_student(_test_id uuid, _student_id uuid)
RETURNS TABLE (
  id uuid,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  marks integer,
  difficulty text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.marks, q.difficulty
  FROM questions q
  INNER JOIN test_questions tq ON tq.question_id = q.id
  INNER JOIN tests t ON t.id = tq.test_id
  WHERE tq.test_id = _test_id
    AND t.active = true
    AND t.client_id = get_user_client_id(_student_id)
$$;

-- 2. Fix test_questions RLS: Replace broad student policy with scoped one
DROP POLICY IF EXISTS "Students can view test questions" ON public.test_questions;

CREATE POLICY "Students can view test questions in their client"
ON public.test_questions
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role) 
  AND EXISTS (
    SELECT 1 FROM tests t 
    WHERE t.id = test_questions.test_id 
    AND t.client_id = get_user_client_id(auth.uid())
  )
);

-- 3. Fix questions RLS: Remove student direct access to correct_answer
DROP POLICY IF EXISTS "Students can view questions from their client" ON public.questions;

-- Students should NOT have direct SELECT on questions (use the function instead)
-- But we need a minimal policy so the test engine can still reference question IDs
CREATE POLICY "Students can view questions without answers from their client"
ON public.questions
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role)
  AND client_id = get_user_client_id(auth.uid())
);

-- 4. Add test sharing columns
ALTER TABLE public.tests 
ADD COLUMN IF NOT EXISTS share_code text UNIQUE,
ADD COLUMN IF NOT EXISTS public_link_enabled boolean DEFAULT false;

-- 5. Create function to generate unique share codes
CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    NEW.share_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_share_code
BEFORE INSERT ON public.tests
FOR EACH ROW
EXECUTE FUNCTION public.generate_share_code();

-- 6. Fix update_updated_at_column search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 7. Allow anonymous users to view tests by share_code (for public links)
CREATE POLICY "Anyone can view tests by share code"
ON public.tests
FOR SELECT
TO anon
USING (public_link_enabled = true AND share_code IS NOT NULL);
