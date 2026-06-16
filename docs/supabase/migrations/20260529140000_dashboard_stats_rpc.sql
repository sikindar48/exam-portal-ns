-- Create high-performance RPC function for client admin dashboard stats
CREATE OR REPLACE FUNCTION public.get_client_admin_stats(client_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_students INT;
  v_total_questions INT;
  v_total_tests INT;
  v_total_attempts INT;
  v_avg_score INT := 0;
  v_pass_rate INT := 0;
  v_top_performers JSONB;
  v_test_performance JSONB;
  
  v_sum_score NUMERIC := 0;
  v_sum_total_marks NUMERIC := 0;
  v_pass_count INT := 0;
BEGIN
  -- 1. Total Students (roles = student)
  SELECT COUNT(DISTINCT user_id) INTO v_total_students
  FROM public.user_roles
  WHERE client_id = client_id_param AND role = 'student';

  -- 2. Total Questions
  SELECT COUNT(*) INTO v_total_questions
  FROM public.questions
  WHERE client_id = client_id_param;

  -- 3. Total Tests
  SELECT COUNT(*) INTO v_total_tests
  FROM public.tests
  WHERE client_id = client_id_param;

  -- 4. Attempts aggregation
  SELECT 
    COUNT(*),
    COALESCE(SUM(score), 0),
    COALESCE(SUM(total_marks), 0),
    COUNT(CASE WHEN total_marks > 0 AND (score::NUMERIC / total_marks::NUMERIC) >= 0.4 THEN 1 END)
  INTO 
    v_total_attempts,
    v_sum_score,
    v_sum_total_marks,
    v_pass_count
  FROM public.attempts a
  JOIN public.tests t ON a.test_id = t.id
  WHERE t.client_id = client_id_param AND a.status = 'submitted';

  -- 5. Calculate avg score & pass rate
  IF v_sum_total_marks > 0 THEN
    v_avg_score := ROUND((v_sum_score / v_sum_total_marks) * 100);
  END IF;
  
  IF v_total_attempts > 0 THEN
    v_pass_rate := ROUND((v_pass_count::NUMERIC / v_total_attempts::NUMERIC) * 100);
  END IF;

  -- 6. Top Performers (Top 5 students by highest percentage score in any attempt)
  SELECT COALESCE(JSONB_AGG(t), '[]'::JSONB) INTO v_top_performers
  FROM (
    SELECT 
      p.name,
      ROUND(MAX(a.score::NUMERIC / a.total_marks::NUMERIC * 100)) as avg
    FROM public.attempts a
    JOIN public.tests t ON a.test_id = t.id
    JOIN public.profiles p ON a.student_id = p.id
    WHERE t.client_id = client_id_param AND a.status = 'submitted' AND a.total_marks > 0
    GROUP BY a.student_id, p.name
    ORDER BY avg DESC
    LIMIT 5
  ) t;

  -- 7. Test Performance (Average score percentage per test)
  SELECT COALESCE(JSONB_AGG(t), '[]'::JSONB) INTO v_test_performance
  FROM (
    SELECT 
      t.test_name as name,
      ROUND(AVG(a.score::NUMERIC / a.total_marks::NUMERIC * 100)) as "avgScore"
    FROM public.attempts a
    JOIN public.tests t ON a.test_id = t.id
    WHERE t.client_id = client_id_param AND a.status = 'submitted' AND a.total_marks > 0
    GROUP BY t.id, t.test_name
  ) t;

  -- Return everything combined
  RETURN JSONB_BUILD_OBJECT(
    'stats', JSONB_BUILD_OBJECT(
      'totalStudents', v_total_students,
      'totalQuestions', v_total_questions,
      'totalTests', v_total_tests,
      'totalAttempts', v_total_attempts,
      'avgScore', v_avg_score,
      'passRate', v_pass_rate
    ),
    'topPerformers', v_top_performers,
    'testPerformance', v_test_performance
  );
END;
$$;
