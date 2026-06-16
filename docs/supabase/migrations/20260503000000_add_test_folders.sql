-- Add test_folders table and folder_id to tests

CREATE TABLE IF NOT EXISTS public.test_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add folder_id to tests (nullable — tests are independent by default)
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.test_folders(id) ON DELETE SET NULL;

-- Enable RLS on test_folders
ALTER TABLE public.test_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_folders

-- Superadmin: full access
CREATE POLICY "Superadmin full access on test_folders"
  ON public.test_folders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

-- ClientAdmin: full access to their own client's folders
CREATE POLICY "ClientAdmin full access on own test_folders"
  ON public.test_folders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'clientadmin'
        AND p.client_id = test_folders.client_id
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_test_folders_client_id ON public.test_folders(client_id);
CREATE INDEX IF NOT EXISTS idx_tests_folder_id ON public.tests(folder_id);

-- Updated_at trigger for test_folders
CREATE OR REPLACE FUNCTION public.update_test_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER test_folders_updated_at
  BEFORE UPDATE ON public.test_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_test_folders_updated_at();
