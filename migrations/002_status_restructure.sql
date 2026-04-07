-- Status restructure: split portal access from workflow stage
--
-- New status values: internal | invited | in_progress | submitted | sent
--
-- - internal: Forbes is prepping the workspace, no client involvement yet
-- - invited:  Portal invite sent, waiting on client to log in
-- - in_progress: Client (or Forbes) actively filling data
-- - submitted: Client clicked "Submit for Review" - on Forbes' desk
-- - sent: Forbes packaged and sent to partner firm (terminal/done)
--
-- Portal access is now derived from client_user_id IS NOT NULL,
-- not encoded in status.

BEGIN;

-- Drop old check constraint if present (name may vary)
ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS submissions_status_check;

-- Backfill in dependency order
-- 1. Anything currently "invited" with no auth user was the bug — these are internal
UPDATE public.submissions
   SET status = 'internal'
 WHERE status = 'invited'
   AND client_user_id IS NULL;

-- 2. Collapse phantom in_review state into submitted
UPDATE public.submissions
   SET status = 'submitted'
 WHERE status = 'in_review';

-- 3. complete -> sent (the new terminal state)
UPDATE public.submissions
   SET status = 'sent'
 WHERE status = 'complete';

-- Add the new check constraint
ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_status_check
  CHECK (status IN ('internal', 'invited', 'in_progress', 'submitted', 'sent'));

-- New default for fresh inserts
ALTER TABLE public.submissions
  ALTER COLUMN status SET DEFAULT 'internal';

COMMIT;
