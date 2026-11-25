# MindPin v1: Implementation tasks

Tasks are ordered so the app is usable after each milestone, and each task names the requirements it satisfies (see `requirements.md`). Build and test one task at a time, then tick its box.

## Milestone 1: Core data and parser (no UI polish)

- [ ] 1. Set up the project: Expo, TypeScript, linting, test runner, folder structure.
- [ ] 2. Create the SQLite schema and migrations for person, memory, and visit, with a typed data-access layer and unit tests. (R4, R5, R8.1)
- [ ] 3. Build `parseShared` for full Google Maps links, Apple Maps links, geo links, and plain coordinates, with unit tests per format. (R2.1)
- [ ] 4. Add short-link redirect resolution and the `pending_resolve` retry queue. (R2.2, R1.5)
- [ ] 5. Add address lookup from coordinates and coordinates lookup from an address. (R2.3, R2.4)

## Milestone 2: Save a shared location end to end

- [ ] 6. Register the Android share target and pass shared text to the app. (R1.1)
- [ ] 7. Build the save sheet: map preview, address, label chips, notes, Save and Cancel. (R1.2, R1.3, R4.1, R4.2)
- [ ] 8. Handle the "no location found" case in the save sheet. (R1.4)
- [ ] 9. Add the contact picker with permission prompt, autocomplete, recent people, and manual name entry. (R3.1 to R3.4, R3.6)
- [ ] 10. Add duplicate detection within 100 m for the same person. (R3.5)
- [ ] 11. Add the iOS Share Extension using the same save sheet. (R1.1)

## Milestone 3: Browse and find

- [ ] 12. Build the home screen with People and Places lists and recently saved items. (R6.3)
- [ ] 13. Build the person screen listing that person's places. (R4.3)
- [ ] 14. Build the place screen with map, notes, tags, edit, and delete. (R4.2, R4.4)
- [ ] 15. Add Navigate (open in maps app) and Share. (R4.5, R4.6)
- [ ] 16. Add full-text search across people, labels, addresses, notes, and tags. (R6.1, R6.2, R6.4)
- [ ] 17. Add the map view of all pins. (R6.3)

## Milestone 3b: Notes

- [ ] 17a. Add `pinned` and `place_id` to the schema with a migration, and extend the data layer for type `note`. (R10)
- [ ] 17b. Build the note editor: auto title, auto-save, formatting, and checklists that sink ticked items. (R10.1 to R10.5)
- [ ] 17c. Build the Notes list with the Pinned section, date groups, and swipe and long-press actions. (R10.6, R10.7, R10.11)
- [ ] 17d. Link a note to a person or place and show linked notes on their screens. (R10.8)
- [ ] 17e. Add "Save as note" to the share sheet. (R10.9)
- [ ] 17f. Add Recently Deleted with the 30-day purge. (R10.10)
- [ ] 17g. Include note text in search. (R6.1)

## Milestone 4: Visits

- [ ] 18. Add "I'm here" check-in and the visit history list. (R5.1, R5.3, R5.4)
- [ ] 19. Add the "Did you visit?" prompt after Navigate. (R5.2)
- [ ] 20. Add the "not visited in a while" card on the home screen. (R5.5)

## Milestone 5: Account, backup, and unlock

- [ ] 21. Add the welcome screen with "continue without account". (R7.1)
- [ ] 22. Add phone sign-in with SMS code, resend timer, and attempt limit. (R7.2 to R7.4)
- [ ] 23. Add Google and email sign-in. (R7.2)
- [ ] 24. Add encrypted backup, restore on a new device, and data export. (R8.2 to R8.4)
- [ ] 25. Add sign-out and account deletion. (R7.5)
- [ ] 26. Add the 25-place limit, the unlock screen, and purchase restore. (R9)

## Milestone 6: Release

- [ ] 27. Run the accessibility, offline, and performance checks from the non-functional requirements.
- [ ] 28. Write the privacy policy and store listings; submit to Google Play closed testing, then the App Store.

Milestones 1 to 3 are the testable core: after them, give the app to 10 to 15 people and watch whether they use the share-to-save flow before building the rest.

## Later phases

Each later phase gets its own spec once v1 shows that people use the save flow.

| Phase | Adds | Depends on |
| --- | --- | --- |
| 2. Ask MindPin | Natural-language questions answered from saved memories, with sources shown; voice input | v1 data model; an AI provider and a cost limit per user |
| 3. More memory types | Receipts (photo to item, price, store, warranty date), voice notes with transcription, and photos, all linkable to a person and place | Phase 2 search; the `payload` field |
| 4. Smarter capture | Optional automatic visit detection, screenshot import, Urdu interface | User demand from v1 feedback |
