---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-22
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — Phase 1 creates the project from scratch |
| **Config file** | none — Wave 0 installs no test framework (smoke tests only) |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && node -e "require('./.next/server/app/page.js')"` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build` + DB schema inspection script (Wave 0)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| SC-1 | 01 | 1 | SC-1: dev starts, build succeeds | — | N/A | smoke | `npm run build` | ❌ W0 | ⬜ pending |
| SC-2 | 01 | 1 | SC-2: DB schema auto-created | — | N/A | smoke | See Wave 0 inline script | ❌ W0 | ⬜ pending |
| SC-3 | 01 | 1 | SC-3: better-sqlite3 reachable | — | N/A | smoke | `npm run build` | ❌ W0 | ⬜ pending |
| SC-4 | 01 | 1 | SC-4: HMR no duplicate connections | — | N/A | manual | Observe dev server logs | ❌ manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] DB schema inspection script (inline Node.js) — covers SC-2:
  ```bash
  node -e "
    const db = require('better-sqlite3')('.data/journal.db');
    const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' OR type='trigger'\").all();
    console.log(tables);
  "
  ```
- [ ] No testing framework needed for Phase 1 — smoke tests via `npm run build` and manual dev server observation are sufficient.

*Existing infrastructure: None (greenfield). Wave 0 = inline node script for DB schema inspection.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HMR no duplicate DB connections | SC-4 | Requires observing dev server logs across multiple file saves | Run `npm run dev`, edit any file, check logs for absence of duplicate "DB init" messages |
| `npm run dev` starts without errors | SC-1 (partial) | Build smoke test doesn't exercise dev server | Run `npm run dev`, observe terminal for errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
