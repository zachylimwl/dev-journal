---
phase: 4
slug: search-filter
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-27
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.7 |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npx vitest run tests/search.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/search.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | SRCH-01 | T-04-01 | FTS5 empty-string guard: no crash on empty MATCH | unit | `npx vitest run tests/search.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | SRCH-01 | T-04-01 | Keyword search returns BM25-ranked matching entries | unit | `npx vitest run tests/search.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | SRCH-01 | — | Debounce fires after 300ms, not per keypress | manual | — | manual only | ⬜ pending |
| 04-02-01 | 02 | 1 | SRCH-02 | — | Tag filter returns only entries with that tag | unit | `npx vitest run tests/search.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | SRCH-02 | — | TagChip click navigates to `/?tag=name` | manual | — | manual only | ⬜ pending |
| 04-03-01 | 03 | 2 | SRCH-03 | — | Combined q+tag returns intersection of matches | unit | `npx vitest run tests/search.test.ts` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 2 | SRCH-03 | — | Clearing tag preserves keyword in URL | manual | — | manual only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/search.test.ts` — unit stubs for SRCH-01 (FTS5 keyword search, empty guard), SRCH-02 (tag filter), SRCH-03 (combined). Use in-memory SQLite + FTS5 virtual table setup (pattern: extend existing `tests/actions.test.ts` beforeEach setup).

*Existing `tests/actions.test.ts` and `tests/tag-normalize.test.ts` require no changes — not FTS5-related.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Debounce fires after 300ms, not per keypress | SRCH-01 | Timing behavior requires browser interaction | Type rapidly in search box; observe network/server requests batch after pause |
| TagChip click navigates to `/?tag=name` | SRCH-02 | Browser navigation requires visual confirmation | Click any tag chip; verify URL updates and entry list filters |
| Clearing tag preserves keyword in URL | SRCH-03 | URL state coordination requires browser interaction | Set both q and tag; clear tag chip; verify q remains in URL |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
