-- Fix get_test_questions_for_student to handle guests and return sections
-- Also update RLS for test_sections to allow guest access

-- 1. Update the function
CREATE OR REPLACE FUNCTION public.get_test_questions_for_student(_test_id uuid, _student_id text)
RETURNS TABLE (
  id uuid, 
  question_text text, 
  option_a text, 
  option_b text, 
  option_c text, 
  option_d text, 
  marks integer, 
  difficulty text,
  section_id uuid,
  section_name text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_public boolean;
  _student_uuid uuid;
BEGIN
  -- Check if test is public
  SELECT public_link_enabled INTO _is_public FROM tests WHERE id = _test_id;
  
  -- Try to cast student_id to uuid if it's not a guest string
  IF _student_id NOT LIKE 'guest_%' THEN
    BEGIN
      _student_uuid := _student_id::uuid;
    EXCEPTION WHEN others THEN
      _student_uuid := NULL;
    END;
  END IF;

  RETURN QUERY
  SELECT 
    q.id, 
    q.question_text, 
    q.option_a, 
    q.option_b, 
    q.option_c, 
    q.option_d, 
    q.marks, 
    q.difficulty,
    ts.id as section_id,
    ts.name as section_name
  FROM questions q
  INNER JOIN test_questions tq ON tq.question_id = q.id
  INNER JOIN tests t ON t.id = tq.test_id
  LEFT JOIN test_sections ts ON ts.id = tq.section_id
  WHERE tq.test_id = _test_id 
    AND t.active = true 
    AND (
      (_is_public = true) OR 
      (_student_uuid IS NOT NULL AND t.client_id = get_user_client_id(_student_uuid))
    )
  ORDER BY ts.position ASC, tq.position ASC, q.created_at ASC;
END;
$$;

-- 2. Update RLS for test_sections to allow guest access for public tests
DROP POLICY IF EXISTS "Students can view test_sections" ON public.test_sections;
CREATE POLICY "Students and guests can view test_sections"
  ON public.test_sections FOR SELECT
  USING (
    public.has_role(auth.uid(), 'student') 
    OR EXISTS (
      SELECT 1 FROM public.tests t 
      WHERE t.id = test_sections.test_id 
      AND t.public_link_enabled = true 
      AND t.active = true
    )
  );

-- 3. Update RLS for questions to allow guest access for public tests (through RPC anyway, but good to have)
DROP POLICY IF EXISTS "Students can view questions from their client" ON public.questions;
CREATE POLICY "Students and guests can view questions"
  ON public.questions FOR SELECT
  USING (
    (public.has_role(auth.uid(), 'student') AND client_id = public.get_user_client_id(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.test_questions tq
      JOIN public.tests t ON t.id = tq.test_id
      WHERE tq.question_id = public.questions.id
      AND t.public_link_enabled = true
      AND t.active = true
    )
  );
