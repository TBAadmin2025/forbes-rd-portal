-- Allow uploading legacy QRE spreadsheets as a first-class document category.
--
-- Pre-portal clients have their employee/QRE data in spreadsheets we collected
-- before the portal existed. Rather than re-keying that data into the employees
-- tab, staff can upload the original spreadsheet for a given tax year and the
-- inventory check + export treat it as the authoritative QRE source for that
-- year.

BEGIN;

-- Drop whatever check constraint currently restricts documents.category, then
-- recreate it under a known name with the expanded value set. The original
-- constraint may have been created anonymously, so we look it up dynamically.
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
   WHERE n.nspname = 'public'
     AND t.relname = 'documents'
     AND a.attname = 'category'
     AND c.contype = 'c'
   LIMIT 1;

  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.documents DROP CONSTRAINT %I', conname);
  END IF;
END $$;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_category_check
  CHECK (category IN ('payroll', 'pandl', 'taxid', 'gross_receipts', 'qre_spreadsheet', 'other'));

COMMIT;
