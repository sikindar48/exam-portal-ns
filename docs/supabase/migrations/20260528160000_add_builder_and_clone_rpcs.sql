-- RPC to upsert test questions transactionally, avoiding data loss and preserving section/order positions
CREATE OR REPLACE FUNCTION public.upsert_test_questions(_test_id uuid, _questions jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client_id uuid;
  _q_record jsonb;
  _q_id uuid;
  _temp_id text;
  _question_text text;
  _option_a text;
  _option_b text;
  _option_c text;
  _option_d text;
  _correct_answer text;
  _marks integer;
  _section_id uuid;
  _position integer;
  _inserted_ids uuid[] := '{}';
  _q_idx integer;
BEGIN
  -- Get test client_id
  SELECT client_id INTO _client_id FROM tests WHERE id = _test_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Test not found');
  END IF;

  -- Verify clientadmin matches test client_id or superadmin
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    IF NOT has_role(auth.uid(), 'clientadmin'::app_role) OR get_user_client_id(auth.uid()) != _client_id THEN
      RAISE EXCEPTION 'Permission denied';
    END IF;
  END IF;

  -- Loop questions
  FOR _q_idx IN 0..jsonb_array_length(_questions) - 1 LOOP
    _q_record := _questions -> _q_idx;
    
    _temp_id := (_q_record ->> 'id');
    _question_text := (_q_record ->> 'question_text');
    _option_a := (_q_record ->> 'option_a');
    _option_b := (_q_record ->> 'option_b');
    _option_c := (_q_record ->> 'option_c');
    _option_d := (_q_record ->> 'option_d');
    _correct_answer := (_q_record ->> 'correct_answer');
    _marks := (_q_record -> 'marks')::integer;
    _section_id := NULL;
    IF (_q_record ->> 'section_id') IS NOT NULL AND (_q_record ->> 'section_id') != 'general' THEN
      _section_id := (_q_record ->> 'section_id')::uuid;
    END IF;
    _position := (_q_record -> 'position')::integer;

    -- If new question (starts with temp_)
    IF _temp_id LIKE 'temp_%' THEN
      INSERT INTO questions (
        client_id, question_text, option_a, option_b, option_c, option_d, correct_answer, marks
      )
      VALUES (
        _client_id, _question_text, _option_a, _option_b, _option_c, _option_d, _correct_answer, _marks
      )
      RETURNING id INTO _q_id;
    ELSE
      _q_id := _temp_id::uuid;
      
      -- Verify this question belongs to this client to prevent cross-tenant update
      IF NOT EXISTS (SELECT 1 FROM questions WHERE id = _q_id AND client_id = _client_id) THEN
        RAISE EXCEPTION 'Question does not belong to your organization';
      END IF;

      UPDATE questions
      SET
        question_text = _question_text,
        option_a = _option_a,
        option_b = _option_b,
        option_c = _option_c,
        option_d = _option_d,
        correct_answer = _correct_answer,
        marks = _marks
      WHERE id = _q_id;
    END IF;

    _inserted_ids := array_append(_inserted_ids, _q_id);

    -- Upsert junction table
    INSERT INTO test_questions (test_id, question_id, section_id, position)
    VALUES (_test_id, _q_id, _section_id, COALESCE(_position, 0))
    ON CONFLICT (test_id, question_id) DO UPDATE
    SET section_id = EXCLUDED.section_id,
        position = EXCLUDED.position;
  END LOOP;

  -- Delete associations that are not in the new list
  DELETE FROM test_questions
  WHERE test_id = _test_id
    AND NOT (question_id = ANY(_inserted_ids));

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_test_questions(uuid, jsonb) TO authenticated;


-- RPC to deep-clone a test (including sections and question associations)
CREATE OR REPLACE FUNCTION public.clone_test(_source_test_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client_id uuid;
  _new_test_id uuid;
  _sec_record record;
  _new_sec_id uuid;
  _sec_map jsonb := '{}'::jsonb;
  _tq_record record;
  _mapped_sec_id uuid;
BEGIN
  -- Get test client_id
  SELECT client_id INTO _client_id FROM tests WHERE id = _source_test_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source test not found';
  END IF;

  -- Verify permissions
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    IF NOT has_role(auth.uid(), 'clientadmin'::app_role) OR get_user_client_id(auth.uid()) != _client_id THEN
      RAISE EXCEPTION 'Permission denied';
    END IF;
  END IF;

  -- 1. Insert new test row copying source configuration
  INSERT INTO tests (
    client_id, folder_id, test_name, timer, shuffle, allow_review,
    negative_marking, negative_marks, restrict_navigation, attempts_allowed,
    status, active, allow_guests
  )
  SELECT 
    client_id, folder_id, 'Copy of ' || test_name, timer, shuffle, allow_review,
    negative_marking, negative_marks, restrict_navigation, attempts_allowed,
    'draft', true, allow_guests
  FROM tests
  WHERE id = _source_test_id
  RETURNING id INTO _new_test_id;

  -- 2. Clone sections and build map of (old_section_id -> new_section_id)
  FOR _sec_record IN 
    SELECT id, name, position FROM test_sections WHERE test_id = _source_test_id
  LOOP
    INSERT INTO test_sections (test_id, name, position)
    VALUES (_new_test_id, _sec_record.name, _sec_record.position)
    RETURNING id INTO _new_sec_id;

    _sec_map := _sec_map || jsonb_build_object(_sec_record.id::text, _new_sec_id::text);
  END LOOP;

  -- 3. Clone questions association
  FOR _tq_record IN 
    SELECT question_id, section_id, position FROM test_questions WHERE test_id = _source_test_id
  LOOP
    _mapped_sec_id := NULL;
    IF _tq_record.section_id IS NOT NULL THEN
      _mapped_sec_id := (_sec_map ->> _tq_record.section_id::text)::uuid;
    END IF;

    INSERT INTO test_questions (test_id, question_id, section_id, position)
    VALUES (_new_test_id, _tq_record.question_id, _mapped_sec_id, _tq_record.position);
  END LOOP;

  RETURN _new_test_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clone_test(uuid) TO authenticated;
