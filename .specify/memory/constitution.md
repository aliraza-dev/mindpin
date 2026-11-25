# MindPin Constitution

## Core Principles

### I. Spec Is the Source of Truth

The spec in `docs/spec/` (`requirements.md`, `design.md`, `tasks.md`) defines what MindPin is.

- Code MUST NOT be written for behavior the spec does not describe.
- Work MUST proceed one task from `tasks.md` at a time, in order, unless the owner directs
  otherwise.
- Before coding a task, the contributor MUST read the requirements it cites and restate the
  acceptance criteria being satisfied.
- WHEN a requirement is unclear, conflicts with another, or needs to change, work MUST stop
  until the owner decides. The spec is updated first, then the code. Code and spec MUST NOT
  drift apart.

Rationale: one written source of truth keeps humans and agents building the same app.

### II. Privacy by Default (NON-NEGOTIABLE)

MindPin holds other people's addresses; trust is the product.

- Addresses, coordinates, contact names, phone numbers, and note text MUST NOT be logged,
  printed, or sent to analytics.
- The device address book MUST NOT be uploaded. Contacts are read on the device only, on
  request, after a permission prompt that states its purpose.
- The app MUST NOT track location in the background.
- Backup turns on at sign-in. Data MUST be encrypted on the device (AES-256) before upload,
  the user MUST be told backup is on, and the user MUST be able to turn it off.
- Auth tokens MUST live in the platform's secure storage. Secrets MUST live in `.env` files,
  which are never committed and never read by agents.

Rationale: a single leak of a contact's home address would end user trust permanently.

### III. Local-First and Offline

The phone's SQLite database is the source of truth; the backend exists only for sign-in and
encrypted backup. Purchases go through the app stores.

- Every v1 feature MUST work with no connection, except short-link resolution, address
  lookup, map tiles, sign-in, backup, purchases, and account deletion. Offline, maps show the
  saved address in place of map tiles.
- A share received offline MUST still be saved; network-dependent resolution is queued as
  `pending_resolve` and retried on the next connection.
- Closing the app mid-save MUST NOT lose data.
- All database changes MUST go through a migration.

Rationale: users save places in chats on weak mobile networks; capture cannot depend on signal.

### IV. Speed of Capture

Capture must be faster than asking again. These budgets are acceptance criteria, not goals.

- Saving a shared location MUST take under 10 seconds end to end: from picking MindPin in the
  system share menu to Save completing and the user being back in the chat app.
- The budgets apply to every save after first-time setup. One-time steps are exempt: the first
  sign-in, the first contacts permission prompt, the backup recovery code, and the unlock
  screen when the free limit is reached. Each MUST appear only when needed and MUST NOT lose
  the share being saved.
- The save sheet MUST open within 2 seconds of sharing.
- A new note MUST open, blank and with the keyboard up, within 1 second of tapping the
  new-note button.
- Search results MUST appear within 300 ms for up to 5,000 saved places; cold start MUST be
  under 3 seconds on a mid-range Android phone.
- Any change that touches the share, save, note-creation, or search path MUST NOT add a
  blocking step (network wait, extra screen, or extra required field) to that path. Network
  work runs after the save, never before it.

Rationale: if pinning is slower than scrolling back through a chat, people will not pin.

### V. Test-First with a Pure Core

- Each acceptance criterion a task covers MUST have a test, written before the code that
  makes it pass.
- The link parser (`parseShared(text) -> ParsedLocation`) MUST be a pure function with no
  network or UI imports, with unit tests for every supported format. Network lookups live in
  a separate module.
- The database layer MUST have unit tests; requirements R1 to R6 MUST each have one
  end-to-end test.
- TypeScript MUST run in strict mode. Tests and the type check MUST pass before a task is
  called done.

Rationale: the parser and database are where silent errors would corrupt users' saved places.

### VI. Accessible and Translatable UI

- Touch targets MUST be at least 44 px, text contrast at least 4.5:1, and every button MUST
  carry an accessibility label.
- All user-facing text MUST live in translation files, never hard-coded, and layouts MUST
  allow right-to-left so Urdu can be added.
- UI MUST use the design tokens in `docs/spec/design.md`, confirmed against the Figma frame
  before a screen is built. Colors and sizes MUST NOT be invented.

Rationale: the launch market is multilingual and the app must pass store accessibility review.

### VII. Scope Discipline

- Features listed under v1 non-goals or later phases MUST NOT be built: receipts, voice notes,
  photos, AI question answering, background visit detection, turn-by-turn navigation, and
  web or desktop versions.
- Designing for later phases is allowed only where the spec already does so (the generic
  `memory` table and `source_raw` field).

Rationale: a small, fast, finished v1 beats a broad, unfinished one.

## Technology and Quality Constraints

- Stack: React Native with Expo and TypeScript (strict), Expo Router; SQLite with FTS5 on the
  device; Supabase for auth and encrypted backup only. Android is tested first, then iOS.
  Changes to these choices are made in the spec's "Assumptions and open decisions" table first.
- Code conventions: named exports only, except where Expo Router requires default exports for
  screens. Tests live next to source (`foo.ts` beside `foo.test.ts`). Layout follows `app/`,
  `src/parser/`, `src/db/`, `src/features/`, `src/ui/`, `src/i18n/`.
- Store rules: permission prompts explain their purpose, account deletion is available in the
  app, and Sign in with Apple is offered on iOS when Google sign-in is.

## Development Workflow

1. Pick the next unchecked task in `docs/spec/tasks.md`.
2. Read the cited requirements and restate the acceptance criteria.
3. Write a failing test per criterion, then make it pass.
4. Run `npm test`, `npx tsc --noEmit`, and `npm run lint`; all MUST pass.
5. Tick the task's checkbox in `tasks.md`.
6. Commit once per task as `T###: <summary>`. Generated folders, `.env` files, and
   `.claude/settings.local.json` MUST NOT be committed.

## Governance

- This constitution takes precedence over other practices. `CLAUDE.md` holds day-to-day
  guidance and MUST stay consistent with it; where they conflict, this document wins until
  amended.
- Amendments are made by the project owner, recorded in this file with a Sync Impact Report,
  and reflected in `docs/spec/` and `CLAUDE.md` in the same change.
- Versioning follows semantic versioning: MAJOR for removing or redefining a principle, MINOR
  for adding a principle or materially expanding guidance, PATCH for wording and clarifications.
- Every task review and plan (`/speckit-plan`, `/speckit-analyze`) MUST check compliance with
  these principles; any deviation MUST be justified in writing and approved by the owner.

**Version**: 2.1.0 | **Ratified**: 2026-11-25 | **Last Amended**: 2026-11-25
