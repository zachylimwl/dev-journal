# Requirements: Dev Journal

**Defined:** 2026-05-21
**Core Value:** A fast place to write and later find anything you've worked on — entries writable in seconds and searchable in seconds

## v1 Requirements

### Entries

- [ ] **ENTR-01**: User can create a new journal entry with a title and free-form Markdown body
- [ ] **ENTR-02**: User can edit any existing entry
- [ ] **ENTR-03**: User can delete an entry with a confirmation prompt
- [ ] **ENTR-04**: Entry changes are auto-saved while writing (debounced ~500ms) — no manual Save button required

### Tags

- [ ] **TAG-01**: User can add one or more project tags to an entry
- [ ] **TAG-02**: Tags are automatically normalized (trimmed, lowercased, deduplicated, empty values removed)

### Viewing

- [x] **VIEW-01**: User sees a list of all entries on the home page, newest first, with date and preview snippet
- [ ] **VIEW-02**: User can open an entry to read it fully rendered as formatted Markdown
- [x] **VIEW-03**: Fenced code blocks in entries render with syntax highlighting

### Search

- [ ] **SRCH-01**: User can search entries by keyword with live results (updates on keypress, debounced)
- [ ] **SRCH-02**: User can filter entries by tag to see all entries with that tag
- [ ] **SRCH-03**: User can combine keyword search and tag filter simultaneously

## v2 Requirements

### Views

- **V2-VIEW-01**: Entry timeline / calendar view — see entries laid out by date
- **V2-VIEW-02**: Entry count per tag visible in tag list

### Export

- **V2-EXPO-01**: User can export entries to Markdown files (.md)

### Stats

- **V2-STAT-01**: Writing streak tracker — days written, entries per project

### Search

- **V2-SRCH-01**: Search result snippets show matched text highlighted
- **V2-SRCH-02**: Tag autocomplete when typing a new tag

## Out of Scope

| Feature | Reason |
|---------|--------|
| Authentication / login | Single-user local app, running on localhost |
| Multi-user support | Personal tool only |
| Cloud deployment | localhost only for v1 |
| Rich text / WYSIWYG editor | Markdown is preferred; no toolbar needed |
| File / image attachments | Adds storage complexity; not core to daily journaling |
| Nested tags or tag hierarchy | Flat tags + FTS search eliminates need for hierarchy |
| Revision history | Adds complexity disproportionate to solo local use |
| Dark mode | Can add later; not core to v1 |

## Traceability

Updated after roadmap creation — 2026-05-21.

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIEW-01 | Phase 2 | Complete |
| VIEW-02 | Phase 2 | Pending |
| VIEW-03 | Phase 2 | Complete |
| ENTR-01 | Phase 3 | Pending |
| ENTR-02 | Phase 3 | Pending |
| ENTR-03 | Phase 3 | Pending |
| ENTR-04 | Phase 3 | Pending |
| TAG-01 | Phase 3 | Pending |
| TAG-02 | Phase 3 | Pending |
| SRCH-01 | Phase 4 | Pending |
| SRCH-02 | Phase 4 | Pending |
| SRCH-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-05-21*
*Last updated: 2026-05-21 after roadmap creation*
