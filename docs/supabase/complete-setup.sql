-- Complete database setup for Exam Portal
-- Run this in Supabase SQL Editor

-- 1. Create enum for user roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('superadmin', 'clientadmin', 'student');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create tables
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  logo_url TEXT,
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  marks INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  test_name TEXT NOT NULL,
  timer INTEGER NOT NULL,
  shuffle BOOLEAN DEFAULT false,
  allow_review BOOLEAN DEFAULT true,
  negative_marking BOOLEAN DEFAULT false,
  negative_marks DECIMAL DEFAULT 0,
  restrict_navigation BOOLEAN DEFAULT false,
  attempts_allowed INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  share_code TEXT UNIQUE,
  public_link_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(test_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  score DECIMAL,
  total_marks DECIMAL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  time_taken INTEGER,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted'))
);

CREATE TABLE IF NOT EXISTS public.attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  selected_option TEXT CHECK (selected_option IN ('A','B','C','D')),
  marked_for_review BOOLEAN DEFAULT false,
  CONSTRAINT attempt_answers_attempt_id_question_id_key UNIQUE(attempt_id, question_id)
);

-- 3. Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

-- 4. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 5. Create functions

-- has_role: SECURITY DEFINER bypasses RLS to avoid circular dependency
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- get_user_client_id: reads from profiles (not user_roles) to avoid circular dependency
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT client_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.get_test_questions_for_student(_test_id uuid, _student_id uuid)
RETURNS TABLE (id uuid, question_text text, option_a text, option_b text, option_c text, option_d text, marks integer, difficulty text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.marks, q.difficulty
  FROM questions q
  INNER JOIN test_questions tq ON tq.question_id = q.id
  INNER JOIN tests t ON t.id = tq.test_id
  WHERE tq.test_id = _test_id AND t.active = true AND t.client_id = get_user_client_id(_student_id)
$$;

CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    NEW.share_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$;

-- create_student: called by clientadmin to create a student without triggering email confirmation
-- Uses service role internally via SECURITY DEFINER
-- create_client_admin: called by superadmin to create a clientadmin user
CREATE OR REPLACE FUNCTION public.create_client_admin(_email TEXT, _password TEXT, _name TEXT, _client_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Create auth user (email pre-confirmed)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    _email,
    crypt(_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', _name),
    now(), now(), '', ''
  )
  RETURNING id INTO _user_id;

  -- Create profile
  INSERT INTO public.profiles (id, name, email, client_id)
  VALUES (_user_id, _name, _email, _client_id);

  -- Assign clientadmin role
  INSERT INTO public.user_roles (user_id, role, client_id)
  VALUES (_user_id, 'clientadmin', _client_id);

  RETURN _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_client_admin(TEXT, TEXT, TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_student(_email TEXT, _password TEXT, _name TEXT, _client_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'clientadmin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Check caller belongs to the same client
  IF get_user_client_id(auth.uid()) != _client_id THEN
    RAISE EXCEPTION 'Cannot create student for a different organization';
  END IF;

  -- Create auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    _email,
    crypt(_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', _name),
    now(), now(), '', ''
  )
  RETURNING id INTO _user_id;

  -- Create profile
  INSERT INTO public.profiles (id, name, email, client_id)
  VALUES (_user_id, _name, _email, _client_id);

  -- Assign student role
  INSERT INTO public.user_roles (user_id, role, client_id)
  VALUES (_user_id, 'student', _client_id);

  RETURN _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_student(TEXT, TEXT, TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_student(_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'clientadmin'::app_role) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _student_id AND client_id = get_user_client_id(auth.uid())) THEN
    RAISE EXCEPTION 'Student not found in your organization';
  END IF;
  DELETE FROM auth.users WHERE id = _student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_student(uuid) TO authenticated;

-- 5. Create triggers
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tests_updated_at ON public.tests;
CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON public.tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_share_code ON public.tests;
CREATE TRIGGER set_share_code BEFORE INSERT ON public.tests FOR EACH ROW EXECUTE FUNCTION public.generate_share_code();

-- 6. Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active clients" ON public.clients;
DROP POLICY IF EXISTS "Superadmins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Client admins can view their own client" ON public.clients;
DROP POLICY IF EXISTS "Students can view their own client" ON public.clients;
DROP POLICY IF EXISTS "Superadmins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Client admins can manage profiles in their client" ON public.profiles;
DROP POLICY IF EXISTS "Students can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Students can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can manage all questions" ON public.questions;
DROP POLICY IF EXISTS "Client admins can manage questions in their client" ON public.questions;
DROP POLICY IF EXISTS "Students can view questions without answers from their client" ON public.questions;
DROP POLICY IF EXISTS "Superadmins can manage all tests" ON public.tests;
DROP POLICY IF EXISTS "Client admins can manage tests in their client" ON public.tests;
DROP POLICY IF EXISTS "Students can view active tests from their client" ON public.tests;
DROP POLICY IF EXISTS "Anyone can view tests by share code" ON public.tests;
DROP POLICY IF EXISTS "Superadmins can manage all test questions" ON public.test_questions;
DROP POLICY IF EXISTS "Client admins can manage test questions" ON public.test_questions;
DROP POLICY IF EXISTS "Students can view test questions in their client" ON public.test_questions;
DROP POLICY IF EXISTS "Superadmins can view all attempts" ON public.attempts;
DROP POLICY IF EXISTS "Client admins can view attempts in their client" ON public.attempts;
DROP POLICY IF EXISTS "Students can manage their own attempts" ON public.attempts;
DROP POLICY IF EXISTS "Superadmins can view all attempt answers" ON public.attempt_answers;
DROP POLICY IF EXISTS "Client admins can view attempt answers" ON public.attempt_answers;
DROP POLICY IF EXISTS "Students can manage their own attempt answers" ON public.attempt_answers;

-- 7. Create RLS policies

-- clients
CREATE POLICY "Anyone can view active clients" ON public.clients
  FOR SELECT TO anon USING (active_status = true);

CREATE POLICY "Superadmins can manage all clients" ON public.clients
  FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Authenticated can view active clients" ON public.clients
  FOR SELECT TO authenticated USING (active_status = true);

CREATE POLICY "Client admins can update their own client" ON public.clients
  FOR UPDATE USING (public.has_role(auth.uid(), 'clientadmin') AND id = public.get_user_client_id(auth.uid()));

-- user_roles: NO circular dependency — SELECT uses direct uid comparison only
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Superadmin can view all roles
CREATE POLICY "Superadmins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'superadmin'));

-- Superadmin INSERT/UPDATE/DELETE uses has_role (SECURITY DEFINER, safe)
CREATE POLICY "Superadmins can insert user roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update user roles" ON public.user_roles
  FOR UPDATE USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete user roles" ON public.user_roles
  FOR DELETE USING (public.has_role(auth.uid(), 'superadmin'));

-- Allow both authenticated and anon (unconfirmed signup) to insert their own role
CREATE POLICY "Users can insert their own role" ON public.user_roles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- profiles
CREATE POLICY "Superadmins can manage all profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Client admins can manage profiles in their client" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'clientadmin') AND client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Allow both authenticated and anon (unconfirmed signup) to insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- questions
CREATE POLICY "Superadmins can manage all questions" ON public.questions
  FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Client admins can manage questions in their client" ON public.questions
  FOR ALL USING (public.has_role(auth.uid(), 'clientadmin') AND client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Students can view questions from their client" ON public.questions
  FOR SELECT USING (public.has_role(auth.uid(), 'student') AND client_id = public.get_user_client_id(auth.uid()));

-- tests
CREATE POLICY "Superadmins can manage all tests" ON public.tests
  FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Client admins can manage tests in their client" ON public.tests
  FOR ALL USING (public.has_role(auth.uid(), 'clientadmin') AND client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Students can view active tests from their client" ON public.tests
  FOR SELECT USING (public.has_role(auth.uid(), 'student') AND client_id = public.get_user_client_id(auth.uid()) AND active = true);

CREATE POLICY "Anyone can view tests by share code" ON public.tests
  FOR SELECT USING (public_link_enabled = true AND share_code IS NOT NULL AND active = true);

-- test_questions
CREATE POLICY "Superadmins can manage all test questions" ON public.test_questions
  FOR ALL USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Client admins can manage test questions" ON public.test_questions
  FOR ALL USING (
    public.has_role(auth.uid(), 'clientadmin') AND
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_questions.test_id
      AND t.client_id = public.get_user_client_id(auth.uid())
    )
  );

CREATE POLICY "Students can view test questions in their client" ON public.test_questions
  FOR SELECT USING (
    public.has_role(auth.uid(), 'student') AND
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_questions.test_id
      AND t.client_id = public.get_user_client_id(auth.uid())
    )
  );

-- attempts
CREATE POLICY "Superadmins can view all attempts" ON public.attempts
  FOR SELECT USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Client admins can view attempts in their client" ON public.attempts
  FOR SELECT USING (
    public.has_role(auth.uid(), 'clientadmin') AND
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = attempts.test_id
      AND t.client_id = public.get_user_client_id(auth.uid())
    )
  );

CREATE POLICY "Students can manage their own attempts" ON public.attempts
  FOR ALL USING (student_id = auth.uid());

-- attempt_answers
CREATE POLICY "Superadmins can view all attempt answers" ON public.attempt_answers
  FOR SELECT USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Client admins can view attempt answers" ON public.attempt_answers
  FOR SELECT USING (
    public.has_role(auth.uid(), 'clientadmin') AND
    EXISTS (
      SELECT 1 FROM public.attempts a
      JOIN public.tests t ON t.id = a.test_id
      WHERE a.id = attempt_answers.attempt_id
      AND t.client_id = public.get_user_client_id(auth.uid())
    )
  );

CREATE POLICY "Students can manage their own attempt answers" ON public.attempt_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.attempts
      WHERE id = attempt_id AND student_id = auth.uid()
    )
  );

-- 8. Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_client_id ON public.user_roles(client_id);
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON public.profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_questions_client_id ON public.questions(client_id);
CREATE INDEX IF NOT EXISTS idx_tests_client_id ON public.tests(client_id);
CREATE INDEX IF NOT EXISTS idx_tests_share_code ON public.tests(share_code);
CREATE INDEX IF NOT EXISTS idx_attempts_student_id ON public.attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON public.attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON public.attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON public.test_questions(test_id);
