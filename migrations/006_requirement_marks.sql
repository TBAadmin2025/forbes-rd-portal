-- Audit blitz: per (submission, year, requirement) override layer.
--
-- The portal already derives "uploaded" from real data (documents,
-- employees, supplies). This table only stores overrides:
--   'have'  — the team confirmed the item exists outside the portal
--             (email, ShareFile, etc.) but hasn't uploaded it yet
--   'n_a'   — the requirement does not apply to this client/year
-- 'unknown' is the absence of a row. 'uploaded' is computed.
--
-- Resolution: n_a > uploaded > have > unknown.
--
-- Primary key on (submission_id, tax_year, requirement_key) makes the
-- mark naturally upsert-able as the team blitz-clicks through cells.

BEGIN;

CREATE TABLE IF NOT EXISTS public.requirement_marks (
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  tax_year integer NOT NULL,
  requirement_key text NOT NULL,
  state text NOT NULL,
  notes text,
  marked_by uuid REFERENCES auth.users(id),
  marked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (submission_id, tax_year, requirement_key)
);

-- Drop and re-add the state check so re-running this migration with a
-- broader value set later is painless.
DO $$
DECLARE
  c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.requirement_marks'::regclass AND conname = 'requirement_marks_state_check'
  LOOP
    EXECUTE format('ALTER TABLE public.requirement_marks DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.requirement_marks
  ADD CONSTRAINT requirement_marks_state_check
  CHECK (state IN ('have', 'n_a'));

CREATE INDEX IF NOT EXISTS requirement_marks_submission_idx
  ON public.requirement_marks (submission_id);

-- Used by the upload queue to find every (submission, year, requirement)
-- where the team has confirmed they have it but it hasn't been uploaded.
CREATE INDEX IF NOT EXISTS requirement_marks_have_idx
  ON public.requirement_marks (state)
  WHERE state = 'have';

COMMIT;
