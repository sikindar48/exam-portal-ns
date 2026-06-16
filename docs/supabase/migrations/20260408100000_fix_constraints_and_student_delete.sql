-- 1. Name the unique constraint on attempt_answers so upsert works by column names
ALTER TABLE public.attempt_answers
  DROP CONSTRAINT IF EXISTS attempt_answers_attempt_id_question_id_key;

ALTER TABLE public.attempt_answers
  ADD CONSTRAINT attempt_answers_attempt_id_question_id_key
  UNIQUE (attempt_id, question_id);

-- 2. RPC for client admins to delete a student (removes profile + user_roles; auth.users cascade handles the rest)
--    We use SECURITY DEFINER so the function runs as the DB owner and can delete from auth.users.
CREATE OR REPLACE FUNCTION public.delete_student(_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a clientadmin and the student belongs to their client
  IF NOT has_role(auth.uid(), 'clientadmin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _student_id
      AND client_id = get_user_client_id(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Student not found in your organization';
  END IF;

  -- Delete from auth.users — cascades to profiles and user_roles
  DELETE FROM auth.users WHERE id = _student_id;
END;
$$;

-- Grant execute to authenticated users (RLS inside the function enforces access)
GRANT EXECUTE ON FUNCTION public.delete_student(uuid) TO authenticated;
