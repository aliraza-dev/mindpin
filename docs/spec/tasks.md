# MindPin: Implementation tasks and phases

The product ships in phases. Phase 1 is v1 and is broken into stages, each ending in something
usable and testable. Phases 2 to 4 get their own spec once v1 shows that people use the save flow.

Each task names the requirements it satisfies (see `requirements.md`). Build and test one task at a
time, in order, then tick its box. A stage is done when every task is ticked and its exit check
passes.

## Phase 1: v1

### Stage 1A: Core data and parser (no UI polish)

Goal: shared text turns into a stored, searchable place, proven by unit tests.

- [ ] 1. Set up the project: Expo, TypeScript, linting, test runner, folder structure.
- [ ] 2. Create the SQLite schema and migrations for person, memory, and visit, with a typed data-access layer and unit tests, including a unique `contact_ref` when set. (R3.7, R4, R5, R8.1)
- [ ] 3. Build `parseShared` for full Google Maps links, Apple Maps links, geo links, and plain coordinates, with unit tests per format, flagging live-location shares as snapshots. (R2.1, R2.5)
- [ ] 4. Add short-link redirect resolution and the `pending_resolve` retry queue. (R2.2, R1.5)
- [ ] 5. Add address lookup from coordinates and coordinates lookup from an address. (R2.3, R2.4)

Exit check: parser unit tests cover every format in the design's parser table; data layer tests pass.

### Stage 1B: Save a shared location end to end

Goal: a location shared from WhatsApp is saved to a person in under 10 seconds.

- [ ] 6. Register the Android share target and pass shared text to the app. (R1.1)
- [ ] 7. Build the save sheet: map preview, address, label chips, notes, Save and Cancel. (R1.2, R1.3, R4.1, R4.2)
- [ ] 8. Handle the "no location found" case in the save sheet. (R1.4)
- [ ] 9. Add the contact picker with permission prompt, autocomplete, recent people, manual name entry, and matching to existing people. (R3.1 to R3.4, R3.6 to R3.8)
- [ ] 10. Add duplicate detection within 100 m for the same person. (R3.5)
- [ ] 11. Add the iOS Share Extension using the same save sheet. (R1.1)

Exit check: end-to-end tests for R1, R2, and R3 pass; a timed run from the share menu to Save
completes in under 10 seconds on a mid-range Android phone.

### Stage 1C: Browse and find

Goal: any saved place is found again in seconds.

- [ ] 12. Build the bottom bar (Home, Map, New note, Settings) and the home screen with the search bar, People and Places lists, and recently saved items. (R6.3, R6.5)
- [ ] 13. Build the person screen listing that person's places. (R4.3)
- [ ] 14. Build the place screen with map, notes, tags, edit, and delete. (R4.2, R4.4)
- [ ] 15. Add Navigate (open in maps app) and Share. (R4.5, R4.6)
- [ ] 15a. Add Call, Message, and Share places to the person screen. (R3.10, R4.8)
- [ ] 15b. Add a place by hand from the person screen and Places view. (R4.7)
- [ ] 16. Add full-text search across people, labels, addresses, notes, and tags. (R6.1, R6.2, R6.4)
- [ ] 17. Add the map view of all pins. (R6.3)

Exit check: end-to-end tests for R4 and R6 pass; search returns within 300 ms with 5,000 places.

### Stage 1D: Notes

Goal: a note is captured as fast as in the phone's notes app and found by search.

- [ ] 17a. Add `pinned` and `place_id` to the schema with a migration, and extend the data layer for type `note`. (R10)
- [ ] 17b. Build the note editor: auto title, auto-save, formatting, and checklists that sink ticked items. (R10.1 to R10.5)
- [ ] 17c. Build the Notes list with the Pinned section, date groups, and swipe and long-press actions. (R10.6, R10.7, R10.11)
- [ ] 17d. Link a note to a person or place and show linked notes on their screens. (R10.8)
- [ ] 17e. Add "Save as note" to the share sheet. (R10.9)
- [ ] 17f. Add Recently Deleted with the 30-day purge. (R10.10)
- [ ] 17g. Include note text in search. (R6.1)

Exit check: a new note opens with the keyboard up within 1 second; R10 criteria all have tests.

### Stage 1E: Visits

Goal: each place shows when it was last visited.

- [ ] 18. Add "I'm here" check-in and the visit history list. (R5.1, R5.3, R5.4)
- [ ] 19. Add the "Did you visit?" prompt after Navigate. (R5.2)
- [ ] 20. Add the "not visited in a while" card on the home screen. (R5.5)

Exit check: end-to-end test for R5 passes.

### Stage 1F: Account, backup, and unlock

Goal: the app meets the sign-in, backup, and payment rules needed to publish.

- [ ] 21. Add the welcome screen (v1 features only) that requires sign-in before first use, and hold any share received before sign-in. (R7.1, R7.6, R7.9)
- [ ] 22. Add phone sign-in with SMS code, auto-fill, resend timer, and attempt limit. (R7.2 to R7.4, R7.7)
- [ ] 23. Add Google sign-in and email sign-in link. (R7.2)
- [ ] 23b. Add the one-time first-name prompt after first sign-in, stored in the `setting` table with a migration. (R7.8)
- [ ] 23a. Add Sign in with Apple on iOS. (Non-functional: store rules)
- [ ] 24. Add encrypted backup with the keychain-stored key and recovery code, restore on a new device, batched upload 5 minutes after the last change, contact re-linking after restore, and data export. (R3.9, R8.2 to R8.4, R8.6 to R8.8)
- [ ] 25. Add sign-out and account deletion. (R7.5)
- [ ] 25a. Add the Settings screen that holds the backup switch, export, sign-out, account deletion, and purchase restore. (R7.5, R8.2, R8.4, R9.3)
- [ ] 26. Add the 25-place limit, the unlock screen, and purchase restore. (R9)

Exit check: sign-in, backup, restore on a second phone, and unlock all work on Android and iOS.

### Stage 1G: Release

Goal: v1 is in store testing.

- [ ] 27. Run the accessibility, offline, and performance checks from the non-functional requirements, including the 10-second save and 1-second new-note budgets, and confirm no background location permission is requested. (R8.5)
- [ ] 28. Write the privacy policy and store listings; submit to Google Play closed testing, then the App Store.

Exit check: every non-functional requirement has a recorded pass.

Stages 1A to 1C are the testable core: after them, give the app to 10 to 15 people and watch whether
they use the share-to-save flow before building the rest. That tester build skips sign-in behind a
build flag (R7.1); store builds never do.

## Later phases

Each later phase gets its own spec once v1 shows that people use the save flow.

| Phase | Adds | Depends on |
| --- | --- | --- |
| 2. Ask MindPin | Natural-language questions answered from saved memories, with sources shown; voice input | v1 data model; an AI provider and a cost limit per user |
| 3. More memory types | Receipts (photo to item, price, store, warranty date), voice notes with transcription, and photos, all linkable to a person and place | Phase 2 search; the `payload` field |
| 4. Smarter capture | Optional automatic visit detection, screenshot import, Urdu interface | User demand from v1 feedback |
