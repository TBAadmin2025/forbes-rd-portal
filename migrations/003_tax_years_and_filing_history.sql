-- Make tax years per-submission and split filing history into a child table.
--
-- Before: every consumer hardcoded [2022,2023,2024,2025] and the schema had
--         filing_status_2022..2025 + filing_date_2022..2025 columns.
-- After:  submissions.tax_years int[] holds the eligible window for each
--         client; submission_filing_history is a child table keyed by
--         (submission_id, tax_year) so adding 2026, 2027, ... requires no
--         schema changes.

BEGIN;

-- 1. Add tax_years array to submissions
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS tax_years integer[] NOT NULL DEFAULT '{2022,2023,2024,2025}';

-- Backfill any existing rows that ended up empty
UPDATE public.submissions
   SET tax_years = '{2022,2023,2024,2025}'
 WHERE tax_years IS NULL OR cardinality(tax_years) = 0;

-- 2. Filing history child table
CREATE TABLE IF NOT EXISTS public.submission_filing_history (
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  tax_year integer NOT NULL,
  filing_status text,
  filing_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (submission_id, tax_year)
);

CREATE INDEX IF NOT EXISTS idx_filing_history_submission
  ON public.submission_filing_history(submission_id);

ALTER TABLE public.submission_filing_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS filing_history_authenticated ON public.submission_filing_history;
CREATE POLICY filing_history_authenticated
  ON public.submission_filing_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Backfill filing_history from the old per-year columns
INSERT INTO public.submission_filing_history (submission_id, tax_year, filing_status, filing_date)
SELECT id, 2022, filing_status_2022, filing_date_2022::date
  FROM public.submissions
 WHERE filing_status_2022 IS NOT NULL OR filing_date_2022 IS NOT NULL
ON CONFLICT (submission_id, tax_year) DO NOTHING;

INSERT INTO public.submission_filing_history (submission_id, tax_year, filing_status, filing_date)
SELECT id, 2023, filing_status_2023, filing_date_2023::date
  FROM public.submissions
 WHERE filing_status_2023 IS NOT NULL OR filing_date_2023 IS NOT NULL
ON CONFLICT (submission_id, tax_year) DO NOTHING;

INSERT INTO public.submission_filing_history (submission_id, tax_year, filing_status, filing_date)
SELECT id, 2024, filing_status_2024, filing_date_2024::date
  FROM public.submissions
 WHERE filing_status_2024 IS NOT NULL OR filing_date_2024 IS NOT NULL
ON CONFLICT (submission_id, tax_year) DO NOTHING;

INSERT INTO public.submission_filing_history (submission_id, tax_year, filing_status, filing_date)
SELECT id, 2025, filing_status_2025, NULL
  FROM public.submissions
 WHERE filing_status_2025 IS NOT NULL
ON CONFLICT (submission_id, tax_year) DO NOTHING;

-- 4. Drop the year-bound columns
ALTER TABLE public.submissions DROP COLUMN IF EXISTS filing_status_2022;
ALTER TABLE public.submissions DROP COLUMN IF EXISTS filing_date_2022;
ALTER TABLE public.submissions DROP COLUMN IF EXISTS filing_status_2023;
ALTER TABLE public.submissions DROP COLUMN IF EXISTS filing_date_2023;
ALTER TABLE public.submissions DROP COLUMN IF EXISTS filing_status_2024;
ALTER TABLE public.submissions DROP COLUMN IF EXISTS filing_date_2024;
ALTER TABLE public.submissions DROP COLUMN IF EXISTS filing_status_2025;

COMMIT;
