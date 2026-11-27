---
description: "MindPin task list, generated from docs/spec/ in Spec Kit format"
---

# Tasks: MindPin v1

**Input**: `docs/spec/requirements.md` (user stories and acceptance criteria), `docs/spec/design.md`
(architecture, data model, parser rules, tokens), `.specify/memory/constitution.md`.

**Tests**: Required. The constitution (Principle V) requires a test for each acceptance criterion,
written before the code that makes it pass, and one end-to-end test for each of R1 to R6.

**Organization**: Phase 1 of the product is v1. It is built in sub-phases 1.1 to 1.10: setup,
foundation, one sub-phase per user story, then release. Later product phases are at the end.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1 to US7, mapped below)
- Requirement ids in brackets, for example (R2.1), say which acceptance criteria a task satisfies

## Path conventions

- `app/`: Expo Router routes only. Route files are thin and render a screen component from
  `src/features/`, so screen tests can live next to their source without becoming routes.
- `src/parser/` link parser (pure), `src/db/` schema, migrations, data access, `src/features/`
  feature logic and screens, `src/ui/` shared components, `src/i18n/` strings, `src/lib/` app-wide
  helpers, `modules/` local native modules, `supabase/` backend config, `e2e/` end-to-end flows.
- Unit and component tests sit next to source: `foo.ts` beside `foo.test.ts`.
- Strings go in one file per feature, `src/i18n/en/<feature>.json`, so feature tasks can run in
  parallel without editing the same file.

## User story map

| Story | Title | Priority | Requirements |
| --- | --- | --- | --- |
| US1 | Save a shared location to a person | P1 (MVP) | R1, R2, R3.1 to R3.8 |
| US2 | Browse and find | P1 | R3.10, R3.12, R4, R6 |
| US3 | Notes | P2 | R10 |
| US4 | Visits | P2 | R5 |
| US5 | Account and sign-in | P3 | R7 |
| US6 | Backup, restore, and export | P3 | R3.9, R8 |
| US7 | Free limit and unlock | P3 | R9 |

---

## Phase 1.1: Setup (shared infrastructure)

**Purpose**: an empty app that builds, lints, type-checks, and runs tests.

- [X] T001 Initialize the Expo app with TypeScript in strict mode and Expo Router: `package.json`, `tsconfig.json` (`"strict": true`), `app.json`, `app/_layout.tsx`
- [X] T002 [P] Configure ESLint and Prettier, with a rule that forbids default exports outside `app/` and a rule that forbids `console.*` outside `src/lib/log.ts`: `eslint.config.js`, `.prettierrc`, `npm run lint` script in `package.json`
- [X] T003 [P] Configure Jest with `jest-expo` and React Native Testing Library, tests next to source: `jest.config.js`, `npm test` script, `src/lib/sanity.test.ts`
- [X] T004 [P] Create the folder structure with placeholder files: `src/parser/`, `src/db/`, `src/features/`, `src/ui/`, `src/i18n/`, `src/lib/`, `modules/`, `supabase/`, `e2e/`
- [X] T005 [P] Set up Maestro for end-to-end flows on an Android emulator: `e2e/README.md`, `e2e/smoke.yaml`, `npm run e2e` script
- [X] T006 [P] Ignore generated folders, `.env*` files, and `.claude/settings.local.json` in `.gitignore`; add `.env.example` listing variable names only (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_REVENUECAT_KEY`)
- [X] T007 Update the Commands section of `CLAUDE.md` with the working start, test, type check, lint, and e2e commands

**Checkpoint**: `npm test`, `npx tsc --noEmit`, and `npm run lint` pass on the empty app.

---

## Phase 1.2: Foundational (blocking prerequisites)

**Purpose**: database, strings, design tokens, shared components, and navigation that every story
uses. No story work starts until this phase is done.

### Tests

- [X] T008 [P] Migration runner tests in `src/db/migrate.test.ts`: migrations apply in order once, a failed migration rolls back, and the version is recorded
- [X] T009 [P] Schema tests in `src/db/schema.test.ts`: tables and columns match `design.md` for `person`, `memory`, `visit`, and `setting`; a second person with the same non-empty `person.contact_ref` is rejected; `memory.type`, `memory.status`, and `visit.source` reject values outside those listed in `design.md`
- [X] T010 [P] Data access tests in `src/db/people.test.ts`, `src/db/memories.test.ts`, `src/db/visits.test.ts`, `src/db/settings.test.ts`: create, read, update, soft delete, and a person with many places (R4.3, R8.1)
- [X] T011 [P] Logger tests in `src/lib/log.test.ts`: the logger accepts only an event name and an allow-list of non-personal fields and drops anything else (constitution II)
- [X] T012 [P] UI primitive tests in `src/ui/Button.test.tsx`: minimum 44 px touch area and a required accessibility label (non-functional: accessibility)

### Implementation

- [X] T013 Migration runner on `expo-sqlite` in `src/db/migrate.ts` and database handle in `src/db/database.ts`
- [X] T014 Migration 001 creating the `person`, `memory`, `visit`, and `setting` tables exactly as in `design.md`, including a partial unique index on `person.contact_ref` and checks on `memory.type`, `memory.status`, `visit.source`, in `src/db/migrations/001_initial.ts` (R3.7)
- [X] T015 Migration 002 creating the FTS5 index over person name and memory title, address, notes, and tags, with triggers that keep it current, in `src/db/migrations/002_search_index.ts`
- [X] T016 [P] Typed data access for people in `src/db/people.ts`
- [X] T017 [P] Typed data access for memories (types `place` and `note`, soft delete via `deleted_at`) in `src/db/memories.ts`
- [X] T018 [P] Typed data access for visits in `src/db/visits.ts`
- [X] T019 [P] Typed data access for settings in `src/db/settings.ts`
- [X] T020 [P] Privacy-safe logger in `src/lib/log.ts`
- [X] T021 [P] Connectivity watcher that emits an event when the device comes online, in `src/lib/network.ts`
- [X] T022 [P] Translation setup with per-feature English files and right-to-left support, in `src/i18n/index.ts` and `src/i18n/en/common.json`
- [X] T023 [P] Design tokens from `design.md` (colors, radii, screen padding, touch target) in `src/ui/tokens.ts`; load Space Grotesk and Inter in `app/_layout.tsx`
- [X] T024 [P] Shared components `Button`, `Chip`, `Card`, `TextField` in `src/ui/`, using tokens only
- [X] T025 Build flag `SKIP_SIGN_IN`, read from app config and false unless set, in `src/lib/buildFlags.ts` (R7.1 tester build)
- [X] T026 Navigation shell: bottom bar with Home, Map, New note (+), and Settings in `app/(tabs)/_layout.tsx`, with placeholder routes `app/(tabs)/index.tsx`, `app/(tabs)/map.tsx`, `app/(tabs)/settings.tsx`, and `app/note/[id].tsx` (R6.5)

**Checkpoint**: the app opens to an empty Home tab; database tests pass.

---

## Phase 1.3: User Story 1 - Save a shared location to a person (Priority: P1) 🎯 MVP

**Goal**: a location shared from WhatsApp is saved to a person without leaving the chat, in under
10 seconds.

**Independent test**: on an Android phone, share a Google Maps link from WhatsApp, pick MindPin,
pick a contact, tap Save. The app returns to WhatsApp, the place is stored with coordinates and
address, and the whole flow takes under 10 seconds.

### Tests for User Story 1

> Write these first and confirm they fail before implementing.

- [X] T027 [P] [US1] Parser unit tests in `src/parser/parseShared.test.ts`, one group per row of the parser table in `design.md`: Google Maps full links (`@lat,lng` and `?q=lat,lng`), Apple Maps `ll`, WhatsApp text with a maps link, `geo:`, plain coordinates with range checks, short links returned as needing resolution, address-only text, and no location found; every coordinate result carries a snapshot flag, false until T138 (R1.4, R2.1, R2.4)
- [X] T028 [P] [US1] Short-link resolver tests with mocked fetch in `src/features/resolve/resolveShortLink.test.ts`, and queue tests in `src/features/resolve/retryQueue.test.ts`: the redirect is followed and parsed; offline leaves the memory `pending_resolve`; the queue retries when the device comes online (R1.5, R2.2)
- [X] T029 [P] [US1] Geocoding tests with a mocked geocoder in `src/features/geocode/geocode.test.ts`: coordinates give an address; an address gives coordinates; no match is reported so the text is kept (R2.3, R2.4)
- [X] T030 [P] [US1] Person matching tests in `src/features/people/matchPerson.test.ts`: a contact with an existing `person.contact_ref` reuses that person; a typed name matching an existing person (ignoring case) is suggested first and never merged; the 3 most recently used people are suggested before typing (R3.3, R3.7, R3.8)
- [X] T031 [P] [US1] Duplicate detection tests in `src/features/places/findNearby.test.ts`: a place for the same person within 100 m is offered for update; 101 m or a different person is not (R3.5)
- [X] T032 [P] [US1] Save service tests in `src/features/save/savePlace.test.ts`: person and place are written in one transaction; closing mid-save leaves no partial rows; the search index is updated; no network call happens before the write (R1.3, R1.5, non-functional: reliability)
- [ ] T033 [P] [US1] Contact picker tests in `src/features/people/ContactPicker.test.tsx`: the first use asks for permission with a one-line reason; matches show name and photo within 300 ms with 1,000 contacts; with permission denied a typed name still saves; only name, phone, and photo reference are stored (R3.1, R3.2, R3.4, R3.6)
- [ ] T034 [P] [US1] Save sheet tests in `src/features/save/SaveSheet.test.tsx`: shows the address and map preview; label chips Home, Office, Shop, and custom; notes and quick tags; Save stores and closes, with or without a person; the no-location state offers Save as note and Enter address (R1.3, R1.4, R2.3, R3.11, R4.1, R4.2)
- [ ] T035 [US1] End-to-end flows `e2e/r1-save-from-share.yaml`, `e2e/r2-read-locations.yaml`, `e2e/r3-link-person.yaml`, run on the Android emulator and the iOS simulator: MindPin appears in the share menu, the sheet opens within 2 seconds, Save returns to the source app, and the full flow is timed under 10 seconds (R1.1, R1.2, R1.3, constitution IV)

### Implementation for User Story 1

- [X] T036 [P] [US1] `ParsedLocation` and result types in `src/parser/types.ts`
- [X] T037 [US1] `parseShared(text)` as a pure function with no network or UI imports, in `src/parser/parseShared.ts` (depends on T036) (R2.1, R2.4)
- [X] T038 [P] [US1] Short-link resolver in `src/features/resolve/resolveShortLink.ts` (R2.2)
- [X] T039 [US1] Retry queue for `pending_resolve` and `pending_geocode` memories in `src/features/resolve/retryQueue.ts`, with migration `src/db/migrations/003_pending_geocode.ts` adding the `pending_geocode` status (design.md `memory.status`) (depends on T021, T038, T040) (R1.5, R2.3, R2.4)
- [X] T040 [P] [US1] Address and coordinate lookup logic behind a `PlatformGeocoder` interface in `src/features/geocode/geocode.ts` (R2.3, R2.4)
- [ ] T139 [US1] Local native module `modules/place-geocoder` (Android `Geocoder`, iOS `CLGeocoder`, no location permission), its adapter with tests in `src/features/geocode/platformGeocoder.ts`, the device lookups in `src/features/save/lookups.ts`, and the retry queue started from `app/_layout.tsx`; the native code must be compiled and checked on an Android and an iOS device before this is ticked (R1.5, R2.3, R2.4)
- [X] T041 [P] [US1] On-device contacts bridge using `expo-contacts`, with no upload path, in `src/features/people/contacts.ts` (R3.6)
- [X] T042 [P] [US1] Person matching and recent people in `src/features/people/matchPerson.ts` (R3.3, R3.7, R3.8)
- [X] T043 [P] [US1] Nearby place lookup by distance in `src/features/places/findNearby.ts` (R3.5)
- [X] T044 [US1] Save service that writes first and resolves or geocodes afterwards, in `src/features/save/savePlace.ts` (depends on T016, T017, T039, T040, T042) (R1.3, R1.5, R3.11)
- [ ] T045 [US1] Contact picker with strings in `src/i18n/en/people.json`, in `src/features/people/ContactPicker.tsx` (depends on T041, T042) (R3.1 to R3.4)
- [ ] T046 [US1] Save sheet with map preview (`react-native-maps`), address, source line, label chips, notes, tags, duplicate prompt, and no-location state, strings in `src/i18n/en/save.json`, in `src/features/save/SaveSheet.tsx` (depends on T037, T043, T044, T045) (R1.2 to R1.4, R4.1, R4.2)
- [ ] T047 [US1] Android share target: `ACTION_SEND` `text/plain` intent filter through a config plugin in `app.json`, a translucent route `app/share.tsx` that shows the save sheet over the source app and returns to it after Save (depends on T046) (R1.1, R1.2, R1.3)
- [ ] T048 [US1] iOS Share Extension that shows the same save sheet and writes to the same database through an App Group, configured in `app.json` with extension code under `targets/share-extension/`; before first sign-in it stores the share and asks the user to open MindPin (depends on T046) (R1.1, R7.6)
- [ ] T138 [US1] Detect live-location shares and flag them as snapshots in `src/parser/parseShared.ts`, with tests in `src/parser/parseShared.test.ts`, once a sample live-location share is recorded in the parser table in `design.md` (blocked: finding U4) (R2.5)

**Checkpoint**: User Story 1 passes its unit, component, and end-to-end tests on Android and iOS.

---

## Phase 1.4: User Story 2 - Browse and find (Priority: P1)

**Goal**: any saved place is found again in seconds, by person, label, address, note, or tag.

**Independent test**: with 5,000 seeded places, typing part of a person's name, a label, an address
word, or a tag shows matches within 300 ms with the device offline; opening a place offers
Navigate and Share.

### Tests for User Story 2

- [X] T049 [P] [US2] Search tests in `src/db/search.test.ts`: matches person names, labels, addresses, place notes, and tags; works with no connection; returns within 300 ms for 5,000 places (R6.1, R6.2, R6.4)
- [X] T050 [P] [US2] Share text tests in `src/features/share/shareText.test.ts`: one place gives a maps link and address; Share places gives every place of a person with label, address, and maps link (R4.6, R4.8)
- [X] T051 [P] [US2] External link tests in `src/features/links/externalLinks.test.ts`: Navigate opens the preferred maps app; Call opens the dialer; Message opens WhatsApp when installed and SMS otherwise (R3.10, R4.5)
- [X] T052 [P] [US2] Home screen tests in `src/features/home/HomeScreen.test.tsx`: People, Places, and Notes views; recently saved items; the search bar has no microphone; Ask MindPin does not appear (R6.3, R6.5)
- [X] T053 [P] [US2] Person screen tests in `src/features/people/PersonScreen.test.tsx`: lists all of the person's places; Call and Message only when a phone number is saved; Share places; Add place opens the save sheet with a typed address or pasted link (R3.10, R4.3, R4.7, R4.8)
- [X] T054 [P] [US2] Place screen tests in `src/features/places/PlaceScreen.test.tsx`, `EditPlaceScreen.test.tsx`, `placeForm.test.ts`, and `editPlace.test.ts`: map shown only with a key, a connection, and a pin; notes, tags; the "⋯" menu; edit of label, address, notes, and tags within the limits in `design.md`; delete with confirmation, keeping linked notes; Navigate, Share (R4.2, R4.4, R4.5, R4.6, R4.9, R4.10)
- [X] T141 [P] [US2] Edit person tests in `src/features/people/personForm.test.ts` and `src/features/people/EditPersonScreen.test.tsx`: the name is required; a phone number must be valid or empty; saving changes only MindPin's copy; search finds the new name (R3.12)
- [ ] T055 [US2] End-to-end flows `e2e/r4-places.yaml` and `e2e/r6-find.yaml`, including the map view showing every saved pin (R6.3)

### Implementation for User Story 2

- [X] T056 [P] [US2] FTS5 search query in `src/db/search.ts` (R6.1, R6.2, R6.4)
- [X] T057 [P] [US2] Share text builder in `src/features/share/shareText.ts` (R4.6, R4.8)
- [X] T058 [P] [US2] External links for maps, dialer, WhatsApp, and SMS in `src/features/links/externalLinks.ts` (R3.10, R4.5)
- [X] T059 [US2] Home screen with search bar, People, Places, and Notes views, and recently saved items, strings in `src/i18n/en/home.json`, in `src/features/home/HomeScreen.tsx`, rendered by `app/(tabs)/index.tsx` (R6.3, R6.5)
- [X] T060 [US2] Results as you type in `src/features/search/SearchResults.tsx`, shown from the home screen (depends on T056) (R6.2)
- [X] T061 [US2] Person screen in `src/features/people/PersonScreen.tsx`, route `app/person/[id].tsx` (depends on T057, T058) (R3.10, R4.3, R4.8)
- [X] T062 [US2] Place screen with the "⋯" menu, and the edit form, in `src/features/places/PlaceScreen.tsx`, `src/features/places/EditPlaceScreen.tsx`, and `src/features/places/editPlace.ts`, routes `app/place/[id]/index.tsx` and `app/place/[id]/edit.tsx` (R4.2, R4.4, R4.5, R4.6, R4.9, R4.10)
- [ ] T140 [US2] Map header on the place screen with `react-native-maps` in `src/features/map/PlaceMap.tsx`, the key read from `GOOGLE_MAPS_ANDROID_KEY` in `app.config.js`; needs the owner's Google Maps key, and must be seen working on an Android and an iOS device before this is ticked (design.md: Maps)
- [X] T142 [US2] Edit person form in `src/features/people/EditPersonScreen.tsx` and `src/features/people/personForm.ts`, opened by the edit button on the person screen, route `app/person/[id]/edit.tsx` (depends on T061) (R3.12)
- [ ] T063 [US2] Add a place by hand from a typed address or pasted link, opening the save sheet, route `app/place/new.tsx` (R4.7)
- [ ] T064 [US2] Map of all pins in `src/features/map/MapScreen.tsx`, rendered by `app/(tabs)/map.tsx` (R6.3)

**Checkpoint**: the testable core is done. Ship an internal build with `SKIP_SIGN_IN` on to 10 to
15 testers and watch whether they use share-to-save before building further (R7.1).

---

## Phase 1.5: User Story 3 - Notes (Priority: P2)

**Goal**: a note is captured as fast as in the phone's notes app and found by search.

**Independent test**: tap +, type a note with a checklist, leave the screen. The note is in the
Notes list under Today with its first line as title, and search finds a word from its body.

### Tests for User Story 3

- [X] T065 [P] [US3] Note text tests in `src/features/notes/noteText.test.ts`: first line becomes `memory.title`, the rest is the preview; ticking a checklist item moves it to the bottom of its checklist (R10.2, R10.5)
- [X] T066 [P] [US3] Grouping tests in `src/features/notes/groupNotes.test.ts`: pinned notes first; sorted by last edited; groups Today, Previous 7 days, Previous 30 days, then by month (R10.6, R10.7)
- [X] T067 [P] [US3] Delete tests in `src/features/notes/deleteNote.test.ts` and `src/features/notes/purge.test.ts`: a deleted note disappears at once; Undo within 5 seconds brings it back unchanged; after 5 seconds, on leaving the screen, or at the next app start it is removed permanently (R10.10)
- [ ] T068 [P] [US3] Editor tests in `src/features/notes/NoteEditor.test.tsx`: opens blank with the keyboard up; saves as the user types with no Save button; headings, bold, italic, bulleted and numbered lists, and checklists (R10.1, R10.3, R10.4)
- [ ] T069 [P] [US3] Notes list tests in `src/features/notes/NotesList.test.tsx`: swipe and long-press both offer pin, link, and delete (R10.11)
- [X] T070 [P] [US3] Linking tests in `src/features/notes/linkNote.test.ts`: a note links to a person, a place, or both, and appears on their screens (R10.8)
- [X] T071 [P] [US3] Save-as-note tests in `src/features/save/saveAsNote.test.ts`: shared text with no location offers "Save as note"; notes never count toward the place limit (R10.9, R10.12)
- [X] T072 [P] [US3] Extend `src/db/search.test.ts` so standalone note text is found (R6.1)
- [ ] T073 [US3] End-to-end flow `e2e/r10-notes.yaml`, timing the new note open at under 1 second (R10.1, constitution IV)

### Implementation for User Story 3

- [X] T074 [P] [US3] Title, preview, and checklist sinking in `src/features/notes/noteText.ts` (R10.2, R10.5)
- [X] T075 [P] [US3] Pinned section and date grouping in `src/features/notes/groupNotes.ts` (R10.6, R10.7)
- [X] T076 [P] [US3] Deleting a note with a 5-second Undo in `src/features/notes/deleteNote.ts`, and the clean-up of interrupted deletions, run at app start from `app/_layout.tsx`, in `src/features/notes/purge.ts` (R10.10)
- [ ] T077 [US3] Rich-text note editor that reads and writes Markdown, opens before the database row exists and creates it on the first keystroke, strings in `src/i18n/en/notes.json`, in `src/features/notes/NoteEditor.tsx`, route `app/note/[id].tsx` (R10.1 to R10.5)
- [ ] T078 [US3] Notes list with swipe and long-press actions in `src/features/notes/NotesList.tsx`, route `app/notes/index.tsx` (depends on T075) (R10.6, R10.7, R10.11)
- [ ] T079 [US3] Undo bar shown for 5 seconds after a note is deleted, in `src/features/notes/UndoDeleteBar.tsx`, used by the Notes list; leaving the screen finishes the deletion (depends on T076, T078) (R10.10)
- [ ] T080 [US3] Link picker and linked notes on the person and place screens, in `src/features/notes/linkNote.ts` and `src/features/notes/LinkPicker.tsx` (depends on T061, T062) (R10.8)
- [X] T081 [US3] "Save as note" option in the save sheet, in `src/features/save/saveAsNote.ts` (depends on T046) (R10.9, R10.12)

**Checkpoint**: User Stories 1 to 3 pass all tests.

---

## Phase 1.6: User Story 4 - Visits (Priority: P2)

**Goal**: each place shows when it was last visited.

**Independent test**: tap "I'm here" on a place; it shows "Last visited just now" and the visit
appears at the top of its history. A place unvisited for 7 months appears on the home screen.

### Tests for User Story 4

- [X] T082 [P] [US4] Last-visited tests in `src/features/visits/lastVisited.test.ts`: relative time or "Not visited yet"; history newest first with optional notes (R5.3, R5.4)
- [X] T083 [P] [US4] Stale place tests in `src/features/visits/stalePlaces.test.ts`: at most 3 places not visited in over 6 months (R5.5)
- [X] T084 [P] [US4] Navigate-confirm tests in `src/features/visits/navigateConfirm.test.ts`: after Navigate, the next app open asks whether the visit happened and records it with `visit.source` `navigate_confirm` when confirmed (R5.2)
- [ ] T085 [US4] End-to-end flow `e2e/r5-visits.yaml` (R5.1)

### Implementation for User Story 4

- [X] T086 [P] [US4] Last-visited text and visit history in `src/features/visits/lastVisited.ts` (R5.3, R5.4)
- [X] T087 [P] [US4] Stale place query in `src/features/visits/stalePlaces.ts` (R5.5)
- [X] T088 [P] [US4] Pending navigate record and prompt logic in `src/features/visits/navigateConfirm.ts` (R5.2)
- [ ] T089 [US4] "I'm here" button and visit list with notes on the place screen, strings in `src/i18n/en/visits.json`, in `src/features/visits/VisitList.tsx` (depends on T062, T086) (R5.1, R5.3, R5.4)
- [ ] T090 [US4] "Did you visit?" prompt shown on app open from `app/_layout.tsx`, in `src/features/visits/DidYouVisit.tsx` (depends on T088) (R5.2)
- [X] T091 [US4] "Not visited in a while" card on the home screen, in `src/features/visits/StaleCard.tsx` (depends on T059, T087) (R5.5)

**Checkpoint**: User Stories 1 to 4 pass all tests.

---

## Phase 1.7: User Story 5 - Account and sign-in (Priority: P3)

**Goal**: the user signs in once at first launch with phone, Google, email link, or Apple.

**Independent test**: a fresh install shows only the welcome screen; signing in by phone with the
SMS code leads to the name prompt and then Home. A share received before sign-in opens in the save
sheet after sign-in.

### Tests for User Story 5

- [ ] T092 [P] [US5] Sign-in gate tests in `src/features/auth/AuthGate.test.tsx`: no screen is reachable before sign-in unless `SKIP_SIGN_IN` is on; a share received before sign-in is held and opens in the save sheet right after sign-in, before the name prompt and recovery code (R7.1, R7.6, R7.8, R8.7)
- [ ] T093 [P] [US5] Phone code tests in `src/features/auth/phoneCode.test.ts`: 5 wrong entries require a new code; resend is available after 60 seconds; an arriving SMS code fills in automatically (R7.3, R7.4, R7.7)
- [ ] T094 [P] [US5] Welcome screen tests in `src/features/auth/WelcomeScreen.test.tsx`: describes only places and notes; offers phone, Google, and email, plus Apple on iOS only, and each button starts its provider's sign-in with Supabase mocked; says backup will be on (R7.2, R7.9, R8.2)
- [ ] T095 [P] [US5] Name prompt tests in `src/features/auth/NamePrompt.test.tsx`: shown once after first sign-in, pre-filled from Google, skippable; the greeting omits the name when skipped (R7.8)
- [ ] T096 [P] [US5] Account tests in `src/features/auth/account.test.ts`: sign-out clears the session; deletion removes the account and all backed-up data; auth tokens are stored only in secure storage (R7.5, non-functional: security)

### Implementation for User Story 5

- [ ] T097 [US5] Supabase client with auth tokens in platform secure storage (`expo-secure-store`) in `src/lib/supabase.ts` (non-functional: security)
- [ ] T098 [US5] Sign-in gate and held share in `src/features/auth/AuthGate.tsx` and `src/features/auth/pendingShare.ts`, wired in `app/_layout.tsx` (depends on T025, T097) (R7.1, R7.6)
- [ ] T099 [US5] Welcome screen, strings in `src/i18n/en/auth.json`, in `src/features/auth/WelcomeScreen.tsx`, route `app/welcome.tsx` (R7.2, R7.9, R8.2)
- [ ] T100 [US5] Phone sign-in with SMS code, auto-fill (Android SMS Retriever, iOS one-time-code field), resend timer, and attempt limit, in `src/features/auth/phoneCode.ts`, routes `app/auth/phone.tsx` and `app/auth/verify.tsx` (R7.2 to R7.4, R7.7)
- [ ] T101 [P] [US5] Google sign-in in `src/features/auth/google.ts` (R7.2)
- [ ] T102 [P] [US5] Email sign-in link with deep-link return, routes `app/auth/email.tsx` and `app/auth/callback.tsx` (R7.2)
- [ ] T103 [P] [US5] Sign in with Apple on iOS using `expo-apple-authentication` in `src/features/auth/apple.ts` (R7.2, non-functional: store rules)
- [ ] T104 [US5] First-name prompt that stores `user_first_name` in the `setting` table, and the home greeting, in `src/features/auth/NamePrompt.tsx`, route `app/auth/name.tsx` (depends on T019, T059) (R7.8)
- [ ] T105 [US5] Sign-out and account deletion, with a server function that deletes the user and their backups, in `src/features/auth/account.ts` and `supabase/functions/delete-account/index.ts` (R7.5)

**Checkpoint**: User Stories 1 to 5 pass all tests; a store build cannot skip sign-in.

---

## Phase 1.8: User Story 6 - Backup, restore, and export (Priority: P3)

**Goal**: data is backed up encrypted from sign-in and comes back on a new phone.

**Independent test**: sign in on phone A, save a place, wait 5 minutes; sign in on phone B with the
same account and platform; restore brings back the place without asking for a code, and the
person is re-linked to the matching contact.

### Tests for User Story 6

- [ ] T106 [P] [US6] Encryption tests in `src/features/backup/crypto.test.ts`: AES-256 round trip; a wrong key fails (R8.2)
- [ ] T107 [P] [US6] Backup key tests with the native module mocked, in `src/features/backup/backupKey.test.ts`: the key is generated on the device, saved to the synced keychain, and never appears in any upload payload (R8.6)
- [ ] T108 [P] [US6] Recovery code tests in `src/features/backup/recoveryCode.test.ts`: a code is shown once when backup first turns on; restore with the code works when the keychain has no key; without key or code the app explains the backup cannot be read (R8.7)
- [ ] T109 [P] [US6] Upload scheduler tests with fake timers in `src/features/backup/scheduler.test.ts`: uploads 5 minutes after the last change in one batch; offline or blocked work runs on the next connection or app open; turning backup off stops uploads (R8.2, R8.8)
- [ ] T110 [P] [US6] Restore tests in `src/features/backup/restore.test.ts`: a signed-in new install is offered the latest backup; after restore, people are re-linked to contacts by phone number, and people without a match keep their data (R3.9, R8.3)
- [ ] T111 [P] [US6] Export tests in `src/features/export/exportData.test.ts`: the file contains every place, note, and visit (R8.4)
- [ ] T112 [P] [US6] Settings screen tests in `src/features/settings/SettingsScreen.test.tsx`: backup switch, export, sign-out, and account deletion are present (R7.5, R8.2, R8.4)

### Implementation for User Story 6

- [ ] T113 [US6] Local Expo module for the backup key: iCloud Keychain synchronizable item on iOS, Google Block Store on Android, in `modules/backup-key/` (R8.6)
- [ ] T114 [P] [US6] Database encryption and decryption in `src/features/backup/crypto.ts` (R8.2)
- [ ] T115 [US6] Key generation and storage in `src/features/backup/backupKey.ts` (depends on T113) (R8.6)
- [ ] T116 [US6] Recovery code generation and key recovery in `src/features/backup/recoveryCode.ts`, screens `app/backup/recovery-code.tsx` and `app/backup/enter-code.tsx` (depends on T115) (R8.7)
- [ ] T117 [US6] Per-user private storage bucket and access policy in `supabase/migrations/001_backup_storage.sql`, and the uploader in `src/features/backup/upload.ts` (depends on T097, T114) (R8.2)
- [ ] T118 [US6] Upload scheduler that turns on at sign-in, in `src/features/backup/scheduler.ts` (depends on T021, T117) (R8.2, R8.8)
- [ ] T119 [US6] Restore offer and flow in `src/features/backup/restore.ts`, route `app/backup/restore.tsx` (depends on T115, T116) (R8.3)
- [ ] T120 [US6] Contact re-linking by phone number after restore in `src/features/people/relinkContacts.ts` (depends on T041, T119) (R3.9)
- [ ] T121 [US6] Data export to a file through the system share menu, in `src/features/export/exportData.ts` (R8.4)
- [ ] T122 [US6] Settings screen with the backup switch, export, sign-out, and account deletion, strings in `src/i18n/en/settings.json`, in `src/features/settings/SettingsScreen.tsx`, rendered by `app/(tabs)/settings.tsx` (depends on T105, T118, T121) (R7.5, R8.2, R8.4)

**Checkpoint**: User Stories 1 to 6 pass all tests; restore works on a second Android and a second
iOS phone.

---

## Phase 1.9: User Story 7 - Free limit and unlock (Priority: P3)

**Goal**: the free tier allows 25 places and a one-time purchase removes the limit.

**Independent test**: with 25 places saved, saving a 26th shows the unlock screen and keeps the
pending place; buying the unlock saves it, and a restore on another phone keeps the limit removed.

### Tests for User Story 7

- [ ] T123 [P] [US7] Limit tests in `src/features/purchase/limit.test.ts`: 25 places allowed; the 26th opens the unlock screen and keeps the pending place; notes never count; existing places stay editable at the limit (R9.1, R9.2, R9.4, R10.12)
- [ ] T124 [P] [US7] Purchase tests with the store mocked, in `src/features/purchase/purchases.test.ts`: a successful purchase removes the limit immediately; restore removes it on another device; the Restore purchases row on the settings screen calls restore (R9.3)

### Implementation for User Story 7

- [ ] T125 [US7] Purchases setup with RevenueCat in `src/features/purchase/purchases.ts` (R9.3)
- [ ] T126 [US7] Limit check before save, holding the pending place, in `src/features/purchase/limit.ts`, called from `src/features/save/savePlace.ts` (depends on T044) (R9.1, R9.2, R9.4)
- [ ] T127 [US7] Unlock screen, strings in `src/i18n/en/purchase.json`, in `src/features/purchase/UnlockScreen.tsx`, route `app/unlock.tsx` (depends on T125, T126) (R9.2, R9.3)
- [ ] T128 [US7] Restore purchases row on the settings screen in `src/features/settings/SettingsScreen.tsx` (depends on T122, T125) (R9.3)

**Checkpoint**: all user stories pass all tests.

---

## Phase 1.10: Polish and release

**Purpose**: the non-functional checks and the store submission.

- [ ] T129 [P] Permissions test in `src/lib/permissions.test.ts`: the built app config requests no background location on Android or iOS (R8.5)
- [ ] T130 [P] Contrast test in `src/ui/tokens.test.ts`: every text and background token pair is at least 4.5:1 (non-functional: accessibility)
- [ ] T131 [P] Accessibility pass with TalkBack and VoiceOver on every screen, results recorded in `docs/release/accessibility.md`
- [ ] T132 [P] Right-to-left layout pass with a forced RTL locale, results in `docs/release/rtl.md` (non-functional: languages)
- [ ] T133 [P] Offline pass of every feature except short-link resolution, address lookup, sign-in, and backup, in `e2e/offline.yaml` (non-functional: offline)
- [ ] T134 Performance pass on a mid-range Android phone: cold start under 3 seconds, save sheet within 2 seconds, full save under 10 seconds, new note within 1 second, search within 300 ms, results in `docs/release/performance.md` (constitution IV)
- [ ] T135 [P] Privacy audit: no address, coordinate, contact name, phone number, or note text in logs or network calls other than encrypted backup, results in `docs/release/privacy-audit.md` (constitution II)
- [ ] T136 [P] Privacy policy and store listings in `docs/release/privacy-policy.md` and `docs/release/store-listing.md`
- [ ] T137 Build profiles in `eas.json`; submit to Google Play closed testing, then the App Store

---

## Dependencies and execution order

### Phase dependencies

- **Setup (1.1)**: none.
- **Foundational (1.2)**: after Setup. Blocks every user story.
- **US1 (1.3)**: after Foundational. No story dependency.
- **US2 (1.4)**: after Foundational. Uses saved places from US1 to be useful, but tests seed data
  directly, so it can be built in parallel.
- **US3 (1.5)**: after Foundational. T080 needs the person and place screens (US2); T081 needs the
  save sheet (US1).
- **US4 (1.6)**: after US2 (place and home screens).
- **US5 (1.7)**: after Foundational. T104 needs the home screen (US2).
- **US6 (1.8)**: after US5 (Supabase client and sign-out).
- **US7 (1.9)**: after US1 (save service) and US6 (settings screen).
- **Polish (1.10)**: after all stories.

### Within each story

- Tests are written first and must fail before implementation.
- Types before logic, logic before screens, screens before platform integration.
- A task is done when its tests, `npx tsc --noEmit`, and `npm run lint` pass.

### Parallel opportunities

- Setup: T002 to T006.
- Foundational: all tests T008 to T012; data access T016 to T019; T020 to T024.
- Every story's test tasks marked [P] can be written together.
- US1: T036, T038, T040, T041, T042, T043 touch separate files.
- After Foundational, US1 and US2 can be built side by side; US3 and US5 can start once their
  named dependencies are done.

---

## Parallel example: User Story 1

```text
# Write the US1 unit tests together:
Task: "Parser unit tests in src/parser/parseShared.test.ts"
Task: "Short-link resolver tests in src/features/resolve/resolveShortLink.test.ts"
Task: "Geocoding tests in src/features/geocode/geocode.test.ts"
Task: "Person matching tests in src/features/people/matchPerson.test.ts"
Task: "Duplicate detection tests in src/features/places/findNearby.test.ts"

# Then build the independent modules together:
Task: "ParsedLocation types in src/parser/types.ts"
Task: "Short-link resolver in src/features/resolve/resolveShortLink.ts"
Task: "Geocoder in src/features/geocode/geocode.ts"
Task: "Contacts bridge in src/features/people/contacts.ts"
Task: "Nearby lookup in src/features/places/findNearby.ts"
```

---

## Implementation strategy

### MVP first

1. Phases 1.1 and 1.2.
2. Phase 1.3 (US1). Stop and check the independent test on a real Android phone, including the
   10-second timing.

### Testable core

3. Phase 1.4 (US2). Ship the internal `SKIP_SIGN_IN` build to 10 to 15 testers and watch whether
   they use share-to-save before continuing.

### Incremental delivery

4. US3 Notes, then US4 Visits, each tested on its own.
5. US5, US6, and US7 together make the app publishable: sign-in, backup, and payment.
6. Phase 1.10, then store submission.

---

## Later phases

Each later phase gets its own spec once v1 shows that people use the save flow.

| Phase | Adds | Depends on |
| --- | --- | --- |
| 2. Ask MindPin | Natural-language questions answered from saved memories, with sources shown; voice input | v1 data model; an AI provider and a cost limit per user |
| 3. More memory types | Receipts (photo to item, price, store, warranty date), voice notes with transcription, and photos, all linkable to a person and place | Phase 2 search; the `payload` field |
| 4. Smarter capture | Optional automatic visit detection, screenshot import, Urdu interface | User demand from v1 feedback |

---

## Notes

- One commit per task, named by its ID: `T046: build the save sheet`. A test task may be committed
  together with the implementation task that makes it pass.
- Tick a task's box only when its tests pass.
- UI tasks: build from the matching frame in the Figma file linked in `design.md`. If the frame is
  missing or contradicts the spec, stop and ask (constitution VI). Missing as of 2026-11-25:
  Settings, unlock, recovery code and restore, map, search results, edit place, edit person, the
  "⋯" menu on a place, the Undo bar
  after deleting a note, "Did you visit?", name prompt, contacts permission, and the save sheet's
  no-location and duplicate states. Out of date: Welcome, Home, Email, Verify, and Notes (its
  "Recently deleted" link is removed, 2026-11-27).
- If a task reveals a gap or conflict in the spec, stop and update `requirements.md` or
  `design.md` first (constitution I).
