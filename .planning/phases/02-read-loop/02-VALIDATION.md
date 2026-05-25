---
phase: 2
slug: read-loop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected in Phase 1 — Wave 0 installs jest + ts-jest (optional) |
| **Config file** | None — Wave 0 adds `jest.config.ts` if planner elects testing |
| **Quick run command** | `npx jest --testPathPattern=unit --passWithNoTests` |
| **Full suite command** | `npx jest --passWithNoTests` |
| **Estimated runtime** | ~5 seconds |

> **MVP note:** Phase 1 has no test infrastructure. Given this is a personal local tool, the planner may elect to skip Wave 0 and rely on manual smoke testing per the success criteria. Research surfaces the gap; the plan owner decides.

---

## Sampling Rate

- **After every task commit:** Run `npx jest --passWithNoTests`
- **After every plan wave:** Run `npx jest --passWithNoTests`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-??-01 | TBD | 1 | VIEW-01 | — | N/A | unit | `npx jest lib/actions.test.ts -t "getEntries"` | ❌ Wave 0 | ⬜ pending |
| 2-??-02 | TBD | 1 | VIEW-01 | — | N/A | unit | `npx jest lib/utils/format.test.ts -t "generateSnippet"` | ❌ Wave 0 | ⬜ pending |
| 2-??-03 | TBD | 1 | VIEW-01 | — | N/A | unit | `npx jest lib/utils/format.test.ts -t "formatEntryDate"` | ❌ Wave 0 | ⬜ pending |
| 2-??-04 | TBD | 2 | VIEW-02 | — | N/A | manual | open `/entries/[id]` in browser | — | ⬜ pending |
| 2-??-05 | TBD | 2 | VIEW-03 | — | N/A | manual | inspect DOM for `.hljs` classes | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/utils/format.test.ts` — stubs for snippet generation and date formatting (VIEW-01)
- [ ] `src/lib/actions.test.ts` — stubs for `getEntries()` ordering and tag aggregation (VIEW-01)
- [ ] `npm install --save-dev jest @types/jest ts-jest` — test framework install

*(If planner decides manual smoke-test only: "None — manual smoke test per success criteria is sufficient for MVP personal tool.")*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Entry detail page renders Markdown with correct heading/list/bold styles | VIEW-02 | React Server Component render requires browser | Open `/entries/[id]` in dev browser; verify prose styles applied |
| Code blocks show `.hljs` classes and highlight.js GitHub Dark colors | VIEW-03 | CSS visual output requires browser inspection | Open entry with a fenced code block; inspect DOM for `.hljs` class and dark background |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
