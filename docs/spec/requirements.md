# MindPin v1: Requirements

MindPin is a mobile app that saves the things people share with you, starting with locations and notes, and lets you find them again by person, by place, or by asking. Tagline: "Pin it once. Ask for it anytime."

**The problem.** Locations shared in chat apps get buried within days, so people ask for them again. Google Maps can save places, but saving takes several steps and nothing is organized by person.

**Who it is for.** Everyday smartphone users who receive locations over WhatsApp or SMS, with heavier use expected from people who visit many addresses (salespeople, tutors, home-service workers).

## v1 goals

- Save a shared location in under 10 seconds without leaving the chat app.
- Link every saved place to a person, with notes such as gate code or floor.
- Show when each place was last visited.
- Jot down a standalone note as fast as in a phone's notes app, and optionally link it to a person or place.
- Find any saved place or note by typing a person, label, or any words in it.
- Keep all data on the device by default.

## v1 non-goals

- Receipts, voice notes, and photos as memory types (phase 3).
- AI question answering (phase 2).
- Automatic background visit detection.
- Turn-by-turn navigation; MindPin hands off to the user's maps app.
- Web or desktop versions.

## Assumptions and open decisions

| Decision | Assumed for this spec | Alternative |
| --- | --- | --- |
| Framework | React Native with Expo and TypeScript | Flutter, or native Swift and Kotlin |
| Platforms | Android and iOS from one codebase, Android first to test | iOS first |
| Local storage | SQLite on the device | Realm, WatermelonDB |
| Backend | Supabase (auth and encrypted backup only) | Firebase, or no backend in v1 |
| Sign-in | Optional: the app works without an account; sign-in is needed only for backup | Sign-in required at first launch |
| Sign-in methods | Phone (SMS code), Google, email | Add Facebook; Apple requires Sign in with Apple on iOS when other social logins are offered |
| Free limit | 25 saved places, then a one-time unlock | Subscription |
| Launch market | Pakistan and nearby WhatsApp-heavy markets | Global English launch |

Open questions:

- [ ] Is the name MindPin free on the App Store, Google Play, and as a trademark in the launch market?
- [ ] Should sign-in be optional as assumed, or required?
- [ ] Is Facebook login worth the extra review and maintenance work for v1?
- [ ] What is the unlock price?

## Requirements

Criteria use the form "WHEN something happens, the app SHALL do something" so each one can become a test.

### R1. Save from the share menu

As a user, I want to share a location from any app into MindPin so that I can save it without leaving the conversation.

1. WHEN the user shares text or a link from another app, MindPin SHALL appear in the system share menu on Android and iOS.
2. WHEN MindPin receives a share, it SHALL open a save sheet over the current app within 2 seconds.
3. WHEN the user taps Save, the place SHALL be stored and the sheet SHALL close, returning the user to the original app.
4. WHEN the shared content contains no recognizable location, the sheet SHALL say so and offer to save it as a text note with a manually entered address.
5. WHEN the device is offline, the share SHALL still be saved, and any link that needs the network to resolve SHALL be resolved on the next connection.

### R2. Read locations from shared content

As a user, I want MindPin to understand whatever format the location arrives in so that I never have to retype it.

1. The app SHALL extract coordinates from Google Maps links (full and short), Apple Maps links, WhatsApp location shares, `geo:` links, and plain latitude and longitude text.
2. WHEN a short link is shared, the app SHALL follow its redirect to get coordinates.
3. WHEN coordinates are found, the app SHALL look up a readable address and show it with a map preview.
4. WHEN only an address is shared with no coordinates, the app SHALL save the text and try to look up coordinates.
5. WHEN a live location is shared, the app SHALL save the position at that moment and label it as a snapshot.

### R3. Link a place to a person

As a user, I want to attach each place to a contact so that I can find places by who they belong to.

1. WHEN the user first tries to pick a contact, the app SHALL ask for contacts permission with a one-line reason.
2. WHEN permission is granted, typing in the "Whose place is this?" field SHALL show matching contacts with name and photo within 300 ms.
3. Before the user types, the field SHALL suggest the 3 most recently used people.
4. WHEN permission is denied or partial, the user SHALL still be able to type a name and save.
5. WHEN a person already has a saved place within 100 m of the new pin, the app SHALL offer to update that place instead of adding a duplicate.
6. The app SHALL store the contact's name, phone number, and photo reference, and SHALL NOT upload the address book.

### R4. Places, labels, and notes

As a user, I want to label places and keep practical notes so that I have what I need on arrival.

1. Each place SHALL have a label chosen from Home, Office, Shop, or a custom label.
2. Each place SHALL accept free-text notes and quick tags (for example gate code, floor, parking).
3. A person SHALL be able to have any number of places.
4. The user SHALL be able to edit or delete a place, with a confirmation before deleting.
5. WHEN the user taps Navigate, the app SHALL open the place in the user's preferred maps app.
6. WHEN the user taps Share, the app SHALL produce a maps link and the address as text for the system share menu.

### R5. Visits

As a user, I want to see when I last visited a place so that I know how long it has been.

1. WHEN the user taps "I'm here" on a place, the app SHALL record a visit with the current date and time.
2. WHEN the user taps Navigate, the app SHALL ask on next open whether the visit happened, and record it if confirmed.
3. Each place SHALL show "Last visited" as relative time, or "Not visited yet".
4. The place screen SHALL list past visits, newest first, each with an optional one-line note.
5. The home screen SHALL show up to 3 places not visited in over 6 months.

### R6. Find things

As a user, I want to search everything I saved so that I can find a place in seconds.

1. The search bar SHALL match person names, labels, addresses, place notes, tags, and the full text of standalone notes.
2. Results SHALL appear as the user types, within 300 ms for up to 5,000 saved places.
3. The home screen SHALL offer People, Places, and Notes views, plus a map view showing all pins.
4. Search SHALL work fully offline.

### R7. Account and sign-in

As a user, I want to start without an account and sign in only when I want backup.

1. On first launch, the app SHALL let the user continue without signing in.
2. The app SHALL support sign-in by phone number with a 6-digit SMS code, by Google, and by email.
3. WHEN an SMS code is entered incorrectly 5 times, the app SHALL require a new code.
4. The user SHALL be able to resend the code after 60 seconds.
5. The user SHALL be able to sign out and to delete the account with all backed-up data.

### R8. Privacy and backup

As a user, I want my contacts' addresses kept private so that I can trust the app with them.

1. All places, notes, and visits SHALL be stored on the device.
2. Backup SHALL be off by default and SHALL be encrypted on the device before upload when turned on.
3. WHEN a signed-in user installs the app on a new phone, the app SHALL offer to restore the latest backup.
4. The app SHALL offer an export of all data as a file.
5. The app SHALL NOT track location in the background in v1.

### R9. Free limit and unlock

As the owner, I want a free tier with a paid unlock so that the app earns revenue.

1. The free tier SHALL allow 25 saved places.
2. WHEN the user tries to save place number 26, the app SHALL show the unlock screen and SHALL keep the pending place until the user decides.
3. WHEN the purchase succeeds, the limit SHALL be removed immediately and on all the user's devices after restore.
4. Existing places SHALL stay readable and editable at the limit.

### R10. Notes

As a user, I want to jot down a note as quickly as in my phone's notes app, and optionally link it to a person or place, so that small things I am told are not lost.

The behavior is modeled on Apple Notes; the look stays MindPin's own.

1. WHEN the user taps the new-note button, a blank note SHALL open with the keyboard up within 1 second.
2. The first line of a note SHALL become its title, and the following text SHALL show as the preview in lists.
3. Notes SHALL save automatically as the user types; there SHALL be no Save button.
4. The editor SHALL support headings, bold, italic, bulleted lists, numbered lists, and checklists with tappable circles.
5. WHEN a checklist item is ticked, it SHALL move to the bottom of its checklist.
6. The user SHALL be able to pin a note, and pinned notes SHALL appear in a Pinned section above all others.
7. The Notes list SHALL sort by last edited and group notes under Today, Previous 7 days, Previous 30 days, then by month.
8. The user SHALL be able to link a note to a person, a place, or both, and linked notes SHALL appear on that person's and that place's screens.
9. WHEN text with no location is shared into MindPin from another app, the save sheet SHALL offer "Save as note".
10. WHEN a note is deleted, it SHALL move to Recently Deleted and SHALL be removed permanently after 30 days.
11. Swiping a note in the list SHALL offer pin, link, and delete, and the same actions SHALL be available from a long-press menu.
12. Standalone notes SHALL NOT count toward the 25-place free limit.

Folders, locked notes, drawings, and attachments are left out of v1; people, places, pins, and search do the organizing.

## Non-functional requirements

| Area | Requirement |
| --- | --- |
| Speed | Save sheet opens within 2 seconds of sharing; search results within 300 ms; cold start under 3 seconds on a mid-range Android phone |
| Offline | Every v1 feature except short-link resolution, address lookup, sign-in, and backup works with no connection |
| Privacy | No analytics containing addresses, coordinates, or contact names; contacts are read only on the device |
| Security | Backups encrypted before upload; auth tokens kept in the platform's secure storage |
| Reliability | No data loss if the app is closed mid-save; database changes use migrations |
| Accessibility | Touch targets at least 44 px; text contrast at least 4.5:1; screen reader labels on all buttons |
| Languages | English in v1; all text in translation files so Urdu can be added, including right-to-left layout |
| Store rules | Permission prompts explain their purpose; account deletion is available in the app; Sign in with Apple is offered on iOS if Google login is |
| Testing | Unit tests for the link parser and database layer; one end-to-end test per requirement R1 to R6 |
