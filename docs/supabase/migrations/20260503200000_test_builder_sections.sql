-- Test Builder: Add sections support and remove difficulty requirement
-- Sections allow grouping questions within a test (e.g. Section A: Python, Section B: SQL)

-- 1. Create test_sections table
CREATE TABLE IF NOT EXISTS public.test_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add section_id and position to test_questions
ALTER TABLE public.test_questions
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.test_sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- 3. Drop the difficulty CHECK constraint so it becomes a free-form nullable field
--    (existing data is preserved; new questions just won't require it)
ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_difficulty_check;

-- 4. RLS for test_sections
ALTER TABLE public.test_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage all test_sections"
  ON public.test_sections FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "ClientAdmins can manage their test_sections"
  ON public.test_sections FOR ALL
  USING (
    public.has_role(auth.uid(), 'clientadmin')
    AND EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_sections.test_id
        AND t.client_id = public.get_user_client_id(auth.uid())
    )
  );

CREATE POLICY "Students can view test_sections"
  ON public.test_sections FOR SELECT
  USING (public.has_role(auth.uid(), 'student'));

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS idx_test_sections_test_id ON public.test_sections(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_section_id ON public.test_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_position ON public.test_questions(test_id, position);
