-- Track where employee/supply rows came from so re-uploads only replace
-- their own kind. The QRE spreadsheet is authoritative for rows imported
-- from it; manual entries and payroll-PDF extractions stay safe.

BEGIN;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

ALTER TABLE public.supplies
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- Drop any existing source check (idempotent re-run) and re-add canonical version.
DO $$
DECLARE
  c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.employees'::regclass AND conname = 'employees_source_check'
  LOOP
    EXECUTE format('ALTER TABLE public.employees DROP CONSTRAINT %I', c);
  END LOOP;
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.supplies'::regclass AND conname = 'supplies_source_check'
  LOOP
    EXECUTE format('ALTER TABLE public.supplies DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_source_check
  CHECK (source IN ('manual', 'payroll_pdf', 'qre_spreadsheet'));

ALTER TABLE public.supplies
  ADD CONSTRAINT supplies_source_check
  CHECK (source IN ('manual', 'qre_spreadsheet'));

COMMIT;
