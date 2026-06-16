-- Add scheduling, publish status, and unlimited attempts support to tests

-- 1. Add new columns
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ;

-- 2. attempts_allowed: NULL means unlimited (was INTEGER DEFAULT 1)
--    Change the column to allow NULL
ALTER TABLE public.tests
  ALTER COLUMN attempts_allowed DROP NOT NULL,
  ALTER COLUMN attempts_allowed DROP DEFAULT;

-- Set existing rows: keep their value, just allow NULL going forward
-- (existing rows already have a value so no data loss)

-- 3. Update the student test visibility policy to respect publish status + schedule
DROP POLICY IF EXISTS "Students can view active tests from their client" ON public.tests;

CREATE POLICY "Students can view published tests from their client"
ON public.tests
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role)
  AND client_id = get_user_client_id(auth.uid())
  AND status = 'published'
  AND active = true
  AND (scheduled_start IS NULL OR scheduled_start <= now())
  AND (scheduled_end IS NULL OR scheduled_end >= now())
);

-- 4. Index for schedule queries
CREATE INDEX IF NOT EXISTS idx_tests_status ON public.tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_scheduled_start ON public.tests(scheduled_start);
