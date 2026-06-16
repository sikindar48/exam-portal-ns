-- Drop existing function first to avoid return type mismatch errors
DROP FUNCTION IF EXISTS public.submit_test_attempt(uuid, integer);

-- Create the submit_test_attempt function to handle server-side scoring and completion
CREATE OR REPLACE FUNCTION public.submit_test_attempt(_attempt_id uuid, _time_taken integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _test_id uuid;
  _score numeric := 0;
  _total_marks integer := 0;
  _negative_marking boolean;
  _negative_marks numeric;
  _correct_count integer := 0;
  _wrong_count integer := 0;
  _unattempted_count integer := 0;
BEGIN
  -- Get test configuration
  SELECT t.id, t.negative_marking, t.negative_marks
  INTO _test_id, _negative_marking, _negative_marks
  FROM attempts a
  JOIN tests t ON t.id = a.test_id
  WHERE a.id = _attempt_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Attempt not found');
  END IF;

  -- Calculate score
  -- We join questions with attempt_answers for this specific attempt
  WITH question_results AS (
    SELECT 
      q.id as q_id,
      COALESCE(q.correct_answer, '') as correct_answer,
      COALESCE(q.marks, 1) as q_marks,
      aa.selected_option as student_answer
    FROM test_questions tq
    JOIN questions q ON q.id = tq.question_id
    LEFT JOIN attempt_answers aa ON aa.question_id = q.id AND aa.attempt_id = _attempt_id
    WHERE tq.test_id = _test_id
  )
  SELECT 
    COALESCE(SUM(CASE WHEN TRIM(UPPER(student_answer)) = TRIM(UPPER(correct_answer)) THEN q_marks ELSE 0 END), 0),
    COALESCE(SUM(q_marks), 0),
    COUNT(CASE WHEN student_answer IS NOT NULL AND TRIM(UPPER(student_answer)) = TRIM(UPPER(correct_answer)) THEN 1 END),
    COUNT(CASE WHEN student_answer IS NOT NULL AND TRIM(UPPER(student_answer)) != TRIM(UPPER(correct_answer)) THEN 1 END),
    COUNT(CASE WHEN student_answer IS NULL THEN 1 END)
  INTO _score, _total_marks, _correct_count, _wrong_count, _unattempted_count
  FROM question_results;

  -- Apply negative marking if enabled
  IF _negative_marking AND _wrong_count > 0 THEN
    _score := _score - (_wrong_count * COALESCE(_negative_marks, 0));
  END IF;

  -- Update attempt record
  UPDATE attempts
  SET 
    status = 'submitted',
    score = GREATEST(0, _score),
    total_marks = _total_marks,
    submitted_at = now(),
    time_taken = _time_taken
  WHERE id = _attempt_id;

  RETURN json_build_object(
    'success', true,
    'score', GREATEST(0, _score),
    'total_marks', _total_marks,
    'correct', _correct_count,
    'wrong', _wrong_count,
    'unattempted', _unattempted_count
  );
END;
$$;
