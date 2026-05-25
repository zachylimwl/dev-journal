---
phase: 3
slug: write-loop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (none detected — Wave 0 installs) |
| **Config file** | `vitest.config.ts` — Wave 0 creates |
| **Quick run command** | `npx vitest run tests/tag-normalize.test.ts --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/tag-normalize.test.ts --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual browser smoke test of editor
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-W0-01 | W0 | 0 | TAG-02 | — | Tag input sanitized server-side regardless of client state | unit | `npx vitest run tests/tag-normalize.test.ts` | ❌ Wave 0 | ⬜ pending |
| 3-W0-02 | W0 | 0 | ENTR-01 | — | createEntry returns `{ id: number }`, never `null` | unit | `npx vitest run tests/actions.test.ts` | ❌ Wave 0 | ⬜ pending |
| 3-W0-03 | W0 | 0 | ENTR-02 | — | updateEntry modifies existing row by ID | unit | `npx vitest run tests/actions.test.ts` | ❌ Wave 0 | ⬜ pending |
| 3-W0-04 | W0 | 0 | ENTR-03 | — | deleteEntry removes entry and cascades entry_tags | unit | `npx vitest run tests/actions.test.ts` | ❌ Wave 0 | ⬜ pending |
| 3-01-xx | 01 | 1 | ENTR-01/02 | — | Editor renders without SSR crash | smoke | `npm run build` | ✅ (build) | ⬜ pending |
| 3-01-xx | 01 | 1 | ENTR-04 | — | Autosave debounce fires after 500ms idle | manual | — | manual-only | ⬜ pending |
| 3-01-xx | 01 | 1 | TAG-01 | — | Tag chip created on Enter or comma | manual | — | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/tag-normalize.test.ts` — unit tests for normalizeTag: trim, lowercase, deduplicate, remove empties (REQ TAG-02)
- [ ] `tests/actions.test.ts` — unit tests for createEntry, updateEntry, deleteEntry with in-memory SQLite (REQ ENTR-01, ENTR-02, ENTR-03)
- [ ] `vitest.config.ts` — minimal Vitest configuration (TypeScript-compatible, no Next.js plugin needed for pure logic tests)
- [ ] `npm install -D vitest` — install Vitest dev dependency

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Autosave fires ~500ms after last keystroke | ENTR-04 | Debounce timing is a UX judgment; automated setTimeout tests are brittle | Open `/new`, type in title, wait 500ms, verify "Saving..." → "Saved just now" appears |
| Tag chip created on Enter / comma | TAG-01 | Requires DOM interaction with live editor; E2E testing out of scope for v1 | Open `/new`, type a tag name, press Enter, verify chip appears and input clears |
| Editor renders without SSR crash | ENTR-01 | `@uiw/react-md-editor` dynamic import with ssr:false — verify at runtime | Run `npm run build && npm start`, navigate to `/new`, verify editor mounts |
| Read-only detail page unaffected by MDEditor CSS | ENTR-02 | CSS import scoping — verify no regression | After Phase 3 install, open an existing entry on `/entries/[id]`, verify prose styles intact |
| First autosave on `/new` redirects to `/entries/[id]/edit` | ENTR-01 | Navigation behavior; requires router interaction | Open `/new`, type a title, wait ~600ms, verify URL changes to `/entries/{id}/edit` |
| Delete confirmation modal opens and works | ENTR-03 | AlertDialog requires user interaction to open | Open an entry, click Delete, verify AlertDialog appears, confirm, verify redirect to `/` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
