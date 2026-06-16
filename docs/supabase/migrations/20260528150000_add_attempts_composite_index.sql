-- Add missing composite index on attempts for faster resumed test lookups
CREATE INDEX IF NOT EXISTS idx_attempts_student_test_status
  ON public.attempts(student_id, test_id, status);
