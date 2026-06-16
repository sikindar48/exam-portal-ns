-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('superadmin', 'clientadmin', 'student');

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  logo_url TEXT,
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table (security best practice - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  UNIQUE(user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  marks INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tests table
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  test_name TEXT NOT NULL,
  timer INTEGER NOT NULL, -- in minutes
  shuffle BOOLEAN DEFAULT false,
  allow_review BOOLEAN DEFAULT true,
  negative_marking BOOLEAN DEFAULT false,
  negative_marks DECIMAL DEFAULT 0,
  restrict_navigation BOOLEAN DEFAULT false,
  attempts_allowed INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create test_questions junction table
CREATE TABLE public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(test_id, question_id)
);

-- Create attempts table
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  score DECIMAL,
  total_marks DECIMAL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  time_taken INTEGER, -- in seconds
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted'))
);

-- Create attempt_answers table
CREATE TABLE public.attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  selected_option TEXT CHECK (selected_option IN ('A', 'B', 'C', 'D')),
  marked_for_review BOOLEAN DEFAULT false,
  UNIQUE(attempt_id, question_id)
);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user's client_id
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- RLS Policies for clients table
CREATE POLICY "Superadmins can manage all clients"
ON public.clients FOR ALL
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Client admins can view their own client"
ON public.clients FOR SELECT
USING (
  public.has_role(auth.uid(), 'clientadmin') 
  AND id = public.get_user_client_id(auth.uid())
);

CREATE POLICY "Students can view their own client"
ON public.clients FOR SELECT
USING (
  public.has_role(auth.uid(), 'student') 
  AND id = public.get_user_client_id(auth.uid())
);

-- RLS Policies for user_roles table
CREATE POLICY "Superadmins can manage all user roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

-- RLS Policies for profiles table
CREATE POLICY "Superadmins can manage all profiles"
ON public.profiles FOR ALL
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Client admins can manage profiles in their client"
ON public.profiles FOR ALL
USING (
  public.has_role(auth.uid(), 'clientadmin')
  AND client_id = public.get_user_client_id(auth.uid())
);

CREATE POLICY "Students can view their own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Students can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- RLS Policies for questions table
CREATE POLICY "Superadmins can manage all questions"
ON public.questions FOR ALL
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Client admins can manage questions in their client"
ON public.questions FOR ALL
USING (
  public.has_role(auth.uid(), 'clientadmin')
  AND client_id = public.get_user_client_id(auth.uid())
);

CREATE POLICY "Students can view questions from their client"
ON public.questions FOR SELECT
USING (
  public.has_role(auth.uid(), 'student')
  AND client_id = public.get_user_client_id(auth.uid())
);

-- RLS Policies for tests table
CREATE POLICY "Superadmins can manage all tests"
ON public.tests FOR ALL
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Client admins can manage tests in their client"
ON public.tests FOR ALL
USING (
  public.has_role(auth.uid(), 'clientadmin')
  AND client_id = public.get_user_client_id(auth.uid())
);

CREATE POLICY "Students can view active tests from their client"
ON public.tests FOR SELECT
USING (
  public.has_role(auth.uid(), 'student')
  AND client_id = public.get_user_client_id(auth.uid())
  AND active = true
);

-- RLS Policies for test_questions table
CREATE POLICY "Superadmins can manage all test questions"
ON public.test_questions FOR ALL
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Client admins can manage test questions"
ON public.test_questions FOR ALL
USING (public.has_role(auth.uid(), 'clientadmin'));

CREATE POLICY "Students can view test questions"
ON public.test_questions FOR SELECT
USING (public.has_role(auth.uid(), 'student'));

-- RLS Policies for attempts table
CREATE POLICY "Superadmins can view all attempts"
ON public.attempts FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Client admins can view attempts in their client"
ON public.attempts FOR SELECT
USING (public.has_role(auth.uid(), 'clientadmin'));

CREATE POLICY "Students can manage their own attempts"
ON public.attempts FOR ALL
USING (student_id = auth.uid());

-- RLS Policies for attempt_answers table
CREATE POLICY "Superadmins can view all attempt answers"
ON public.attempt_answers FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Client admins can view attempt answers"
ON public.attempt_answers FOR SELECT
USING (public.has_role(auth.uid(), 'clientadmin'));

CREATE POLICY "Students can manage their own attempt answers"
ON public.attempt_answers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.attempts
    WHERE id = attempt_id AND student_id = auth.uid()
  )
);

-- Trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON public.tests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();