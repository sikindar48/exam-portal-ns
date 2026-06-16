-- Index for RLS policy lookups — has_role() and get_user_client_id() hit these on every query
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON public.profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_questions_client_id ON public.questions(client_id);
CREATE INDEX IF NOT EXISTS idx_tests_client_id ON public.tests(client_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student_id ON public.attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON public.attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON public.attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON public.test_questions(test_id);
