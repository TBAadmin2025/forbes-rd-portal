# Handoff — Client Inventory feature

Branch: `claude/client-audit-planning-XUQ1k`
Last commits: `0a22553`, `e2d4474`

This is a transient note for the next Claude Code session picking up this branch in VS Code. Delete after the branch is merged and verified.

---

## What was built

Phase 1 of the "client audit" workflow — staff can now sweep every client and see, per tax year, which required materials are missing.

- `/admin/inventory` — per-year audit table (status filters, completeness filter, expandable rows with per-year matrix, inline year toggle, internal notes textarea)
- `/admin/dashboard` — new "Inventory Snapshot" section above the kanban: scorecard strip, year-health bars, top-7 needs-attention list with per-year requirement dot grid
- New `qre_spreadsheet` document category for legacy clients whose pre-portal QRE data lives in spreadsheets — satisfies the per-year QRE check when uploaded
- `AddClientModal` requires picking tax years at creation; `POST /api/admin/invite` validates and persists them
- `ExportPanel` pre-flight rewired to per-year completeness via the shared helper, so audit and export agree
- Shared completeness helper at `src/lib/inventory/completeness.ts` is the single source of truth

## Required first steps in this session

1. **Apply migration `migrations/004_qre_spreadsheet_category.sql`** to Supabase before doing anything else. Until it runs, the new upload slot fails with a CHECK constraint violation. Path: Supabase dashboard → SQL Editor → paste file contents → run. The migration extends `documents.category` to allow `qre_spreadsheet` and is idempotent.
2. **Verify the build still passes:**
   ```
   npm install
   npx tsc --noEmit
   npm run lint
   npm run build
   ```
   Expected: typecheck clean, lint shows the same 20 pre-existing problems (3 errors / 17 warnings) that existed before this branch — no new ones. Build succeeds when `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **Smoke-test in the browser** (`npm run dev`):
   - `/admin/inventory` loads. Toggle a year on a row — it persists. Edit notes — saves on blur.
   - `/admin/dashboard` shows the new snapshot row. "Audit" button on a needs-attention row deep-links to `/admin/inventory#<id>` and that row is pre-expanded.
   - `/admin/submission/<id>/workspace` Documents tab shows a "QRE Spreadsheet (Legacy)" upload card. Uploading a file persists.
   - `ExportPanel` pre-flight on a submission detail page reflects per-year status.

There are no automated tests in this repo. Verification = typecheck + lint + build + manual smoke test above.

## What is NOT done

Phase 2 has not started. Open scope:
1. Manual nudge — "send this client a missing-items email" button on Inventory rows
2. Client-facing portal view — clients see their own missing items
3. Templated reminders (deferred)
4. Scheduled/automated reminders (deferred)

User leaning: build #1 + #2 first; defer #3/#4 until #1 has been used.

## Things to avoid

- Don't push to `main`. Develop on this branch.
- Don't add backwards-compat shims (legacy upload paths, deprecated category aliases). The `qre_spreadsheet` category is additive; existing categories untouched.
- Don't add `qre_spreadsheet` to the client-side portal upload flow (`/portal/upload`). It's a staff-only concept.
- Heed `AGENTS.md` — Next.js 16 has breaking changes from training-data versions.

## Useful pointers

- Completeness rules: `src/lib/inventory/completeness.ts` — change here, both Inventory and ExportPanel update.
- Inventory data shape: `GET /api/admin/inventory` returns `{ rows: InventoryRow[] }` where each row has a fully-evaluated `completeness` object.
- Tax-year edits route through existing `PATCH /api/submissions/[id]` (admin-only allows arbitrary fields).
- Migrations follow `NNN_description.sql`, wrapped in `BEGIN; ... COMMIT;`, idempotent guards (`IF NOT EXISTS` etc.). Next number is `005`.
