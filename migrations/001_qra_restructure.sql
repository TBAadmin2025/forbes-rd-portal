-- ============================================================================
-- Migration 001: QRA PDF Extraction + Master Employees + Per-Year Data Restructure
-- ============================================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run)
-- This is destructive — drops qra_projects and qra_challenges tables.
-- All test data has already been cleared.
-- ============================================================================

-- 1. Drop old QRA narrative tables
DROP TABLE IF EXISTS public.qra_challenges CASCADE;
DROP TABLE IF EXISTS public.qra_projects CASCADE;

-- 2. Create qra_activities (replaces qra_projects + qra_challenges)
CREATE TABLE IF NOT EXISTS public.qra_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  project_number integer,
  name text NOT NULL,
  description text,
  technical_uncertainty text,
  experimentation text,
  outcomes text,
  raw_text text,
  ai_extracted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qra_activities_submission ON public.qra_activities(submission_id);
CREATE INDEX IF NOT EXISTS idx_qra_activities_number ON public.qra_activities(submission_id, project_number);

ALTER TABLE public.qra_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to qra_activities" ON public.qra_activities
  FOR ALL USING (auth.role() = 'authenticated');

-- 3. Create client_employees (master employee list)
CREATE TABLE IF NOT EXISTS public.client_employees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  employee_type text NOT NULL DEFAULT 'Employee',
  state text,
  years_worked integer[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_employees_submission ON public.client_employees(submission_id);

ALTER TABLE public.client_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to client_employees" ON public.client_employees
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. Add client_employee_id to existing employees table
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS client_employee_id uuid REFERENCES public.client_employees(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_employees_client_employee ON public.employees(client_employee_id);

-- 5. Create junction table for employee-year ↔ qra_activities (many-to-many)
CREATE TABLE IF NOT EXISTS public.employee_year_activities (
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.qra_activities(id) ON DELETE CASCADE,
  PRIMARY KEY (employee_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_year_activities_employee ON public.employee_year_activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_year_activities_activity ON public.employee_year_activities(activity_id);

ALTER TABLE public.employee_year_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to employee_year_activities" ON public.employee_year_activities
  FOR ALL USING (auth.role() = 'authenticated');

-- 6. Add vendor column to supplies
ALTER TABLE public.supplies
  ADD COLUMN IF NOT EXISTS vendor text;

-- ============================================================================
-- Done. Verify with:
--   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Should include: qra_activities, client_employees, employee_year_activities
-- Should NOT include: qra_projects, qra_challenges
-- ============================================================================
