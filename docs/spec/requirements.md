# MindPin v1: Requirements

MindPin is a mobile app that saves the things people share with you, starting with locations and notes, and lets you find them again by person, by place, or by asking. Tagline: "Pin it once. Ask for it anytime."

**The problem.** Locations shared in chat apps get buried within days, so people ask for them again. Google Maps can save places, but saving takes several steps and nothing is organized by person.

**Who it is for.** Everyday smartphone users who receive locations over WhatsApp or SMS, with heavier use expected from people who visit many addresses (salespeople, tutors, home-service workers).

## Clarifications

### Session 2026-11-25

- Q: Should people be able to use MindPin without creating an account, signing in only when they want backup? → A: No. Sign-in is required at first launch before anything else.
- Q: Should backup to the server be turned on automatically once the user signs in? → A: Yes. Backup turns on at sign-in; users can turn it off in Settings.
- Q: When someone restores a backup on a new phone, where does the key that unlocks the encrypted backup come from? → A: The platform's synced keychain (iCloud Keychain on iOS, Google Block Store on Android), with a one-time recovery code for switching platforms. The server never holds the key.
- Q: How soon after a change should it be backed up to the server? → A: 5 minutes after the last change, on any connection, batching all changes since the previous upload.
- Q: When the user saves a place for someone who may already be in MindPin, how should the app decide it's the same person? → A: By device contact ID; a typed name that matches an existing person is suggested, never merged automatically. After a restore, people are re-linked to contacts by phone number.

Decisions from the Figma review (2026-11-25):

- Welcome screen: shows only v1 features (places and notes) and says backup is on; no Receipts or Voice notes.
- Sign-in methods: phone, Google, email sign-in link (no password), and Sign in with Apple on iOS. Facebook is dropped for v1.
- Home: the top bar is plain search with no microphone; Ask MindPin and its tab are hidden until phase 2.
- User name: asked once after first sign-in, optional, pre-filled from Google; used only for the greeting.
- Navigation: bottom bar with Home, Map, and Settings, and a floating + button on Home for a new note or a new place (changed 2026-11-28; it was a + in the middle of the bar).
- Person screen: Call, Message, and Share places are in v1.
- Verify code: the SMS code fills in automatically; "Call me" is dropped.
- Tester build: the 10 to 15 person test after User Story 2 (tasks phase 1.4) uses an internal build that skips sign-in.

Decisions from the spec analysis (2026-11-25):

- Speed budgets apply to every save after first-time setup; first sign-in, the first contacts prompt, the recovery code, and the unlock screen are exempt but must never lose the share (constitution 2.1.0).
- A share held before sign-in opens in the save sheet right after sign-in, before the name prompt and recovery code. On iOS the share extension stores it and asks the user to open MindPin.
- Offline exceptions now include map tiles, purchases, and account deletion; offline maps show the address instead.
- No-location shares offer one pair of choices: Save as note, or Enter address (R1.4 and R10.9 merged).
- A person is suggested but not required to save a place.
- Addresses waiting for lookup while offline get the status `pending_geocode`; an address-only place may have no coordinates.

Decisions during the build (2026-11-26):

- Address lookup uses the phone's built-in service through a small native module, so MindPin does not ask for the location permission. `expo-location` was rejected because it requires that permission on Android and adds location permissions to the app.
- MindPin only reads contacts; the permission to edit contacts is blocked in the app config.
- Navigate (R4.5) opens the phone's default maps app on Android (or its app chooser) and Apple Maps on iOS, falling back to a Google Maps web link. Choosing a different maps app on iOS is not in v1.
- Message (R3.10) opens WhatsApp for numbers saved with a country code. WhatsApp rejects local-format numbers, so a local mobile number is first converted using the phone's region, for the launch market only (Pakistan: `03…` becomes `+92 3…`). Any other local number opens SMS.
- Shared text (R4.6, R4.8) contains the label, address, and maps link only, never notes or tags, which can hold gate codes.
- Checklists (R10.5): unticking an item moves it back above the ticked items, as in Apple Notes. An item's indented sub-items move with it.
- Notes list (R10.7): groups use calendar days in the phone's time zone. Today is the current day, Previous 7 days is 1 to 7 days ago, Previous 30 days is 8 to 30 days ago, and older notes are grouped by month and year.
- Visits: a visit note is kept as one line (R5.4). The home card (R5.5) uses 6 calendar months and also counts a place that was saved over 6 months ago and never visited.
- Deleting a note (R10.10, owner decision 2026-11-27): a deleted note is gone for good. Recently Deleted and the 30-day wait are removed; an Undo button for 5 seconds on the same screen replaces them. If the app is closed while Undo is showing, the note is removed at the next start.
- After Navigate (R5.2): only the latest Navigate is remembered. The question appears the first time the app is opened at least 15 minutes later, so going back to check a gate code does not trigger it. Yes records the visit at the time of Navigate; No drops it.

Decisions during the build (2026-11-28):

- Adding things (R4.7, R6.5, owner request): the + in the middle of the bottom bar looked out of place and only made notes. It is now a floating button at the bottom right of Home. Tapping it turns the + into a x and shows two choices, New note and Add place, so the app can be used before any share arrives.
- Home lists (owner request): sliding a person or a place sideways uncovers Edit and Delete. Delete asks the same question as on the edit screens before anything is removed (R3.13, R4.4). Notes keep their Undo instead of a question (R10.10).
- Note editor look (owner request): it follows the phone's own notes app. The date sits above the note, the first line is large, every row of writing has a faint rule under it and the rules run on down the page, and there is more room at the top.
- App name on Home (owner request): a small pin in the accent color sits before "MindPin". It is drawn in code until a logo is chosen from the brand frames; the app icon is still the default one.
- Settings: the screen now exists with the theme choice only. Backup, export, sign-out, and account deletion are added by T122.
- People and Places on Home (R6.3, owner request): a sideways swipe on Home moves between the People and Places lists; it does nothing while searching, and a row that slides for its own actions keeps its gesture. The new list slides in from the side it was swiped from and clears from behind a pane of frosted glass.
- Glass tabs (R6.3, R6.5, owner request and example): the bottom bar is a capsule filled with the theme color, with the open tab named under its icon; People, Places, and Notes on Home are a capsule with a wash of the theme color. Over the open tab sits a clear lens of glass, larger than the capsule, with a thick bright rim, after the bars of iOS 26. The lens can be dragged: it follows the finger, swells and stretches while held, and settles on the nearest tab with a soft bounce. Tapping a tab still works, and each tab stays at least 44 px high. The screens of the bottom bar slide and fade into each other. The bottom bar floats over the screens and its capsule is frosted glass: the screen behind it shows through blurred, under the theme color (owner go-ahead, 2026-11-28). The blur is the native package `expo-blur`, so it needs a build made after the package was added; an older build, and Android before version 12, show the capsule without blur. Each tab screen leaves room at its bottom edge for the floating bar. The lens itself is clear and does not bend what is under it.
- Bold and italic in a note (R10.4, owner report 2026-11-28): no Markdown marks are shown. With text selected, Bold or Italic styles that text, or removes the style when all of it already has it. With only a cursor, the button switches the style on or off for what is typed next. New writing otherwise takes the style of the writing before it. The Bold and Italic buttons are highlighted for the style at the cursor or of the whole selection, not for the whole line.
- Note toolbar (R10.4, owner request): its seven buttons share the width evenly, the list buttons are drawn rather than typed so they line up, and the button of every style the current line has is highlighted.
- Notes list (R10.11): swiping a note sideways uncovers Pin, Link, and Delete; press and hold opens a menu with the same three. Only one deleted note waits for Undo at a time: deleting a second one finishes the first.
- Linking a note (R10.8): the link screen lists every person and every place, each with a None choice. It opens from the Notes list and from the editor.
- Map (R6.3): a pin shows its label when tapped, and tapping the label opens the place. With no maps key, no connection, or no pinned place, the screen says why instead of drawing a map. The user's own position is never shown.
- Did you visit (R5.2): the question is a sheet over whatever screen is open, also when the app returns from the background.
- The Notes and Note editor frames could not be read from Figma on this date (the plan's tool-call limit was reached), so those screens follow the styles of the other frames and must be compared with the frames later.

Decisions during the build (2026-11-27):

- Place screen (R4.4, owner decision): Edit and Delete sit behind a "⋯" button at the top right, opposite the back button. This button is not in the Figma frame.
- Editing a place (R4.10): the label, address, notes, and tags can be changed. Changing the address changes the text only: the pin stays where it was shared, and only a place with no pin has its location looked up again. Moving a place to another person waits for the contact picker.
- Deleting a place (R4.9): the app asks first. The place's visits go with it. Notes linked to the place are kept and lose only that link.
- Editing a person (R3.12, owner decision): the Person screen's edit button changes the name and phone number kept in MindPin. The phone's own address book is never changed.
- Deleting a person (R3.13, owner decision): only the person is removed, after a confirmation. Their places and notes are kept, under no person. The Delete button sits at the bottom of the edit form; it is not in a Figma frame. The phone's own address book is never changed.
- Map key (owner decision): the map on Android needs a Google Maps key, which the owner will supply later. A dummy key cannot draw a map, because Google sends map images only for a valid key. So the map is built and stays off until the key is set: the Place screen then shows its plain header, with the address below as before. The same happens offline and for a place with no pin. iOS uses Apple Maps and needs no key.
- Screens with no Figma frame (owner decision): they are built now from the styles of the existing frames instead of waiting for a frame, and listed in `tasks.md` so a frame can replace them later.
- Save sheet (R1.2 to R1.4, R3.1 to R3.5, R4.1, R4.2):
  - Save never waits for a lookup. The sheet shows the address as soon as it is found; a short link or address that is still being looked up is saved as it is and finished afterwards (R1.5).
  - The label starts on Home, so a save needs no extra tap; the user can change it.
  - Tags are typed in one field, separated by commas, as in the edit form. The Figma frame has no tags field.
  - Contacts permission (R3.1) is asked from inside the "Whose place is this?" field: a one-line reason with an Allow button, shown once the user uses the field. The system prompt appears only after Allow. A typed name always works without it (R3.4).
  - A typed name that is not picked from the list becomes a new person (R3.8).
  - Duplicate (R3.5): when the chosen person has a place within 100 m, the sheet offers "Update" or "Save as new"; it saves as new unless Update is chosen.
  - No location (R1.4): the sheet says so and offers Save as note and Enter address.
  - Add place by hand (R4.7): one field for a pasted link or a typed address, then the same sheet.

## v1 goals

- Save a shared location in under 10 seconds without leaving the chat app.
- Link saved places to a person (suggested, not required), with notes such as gate code or floor.
- Show when each place was last visited.
- Jot down a standalone note as fast as in a phone's notes app, and optionally link it to a person or place.
- Find any saved place or note by typing a person, label, or any words in it.
- Keep all data on the device, with an encrypted backup to the user's account that is on from sign-in.

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
| Sign-in | Required at first launch, before any other screen (decided 2026-11-25) | Optional, needed only for backup (rejected) |
| Sign-in methods | Phone (SMS code), Google, email sign-in link (no password), and Sign in with Apple on iOS | Facebook (dropped for v1, 2026-11-25); email with password (rejected) |
| Free limit | 25 saved places, then a one-time unlock | Subscription |
| Launch market | Pakistan and nearby WhatsApp-heavy markets | Global English launch |

Open questions:

- [ ] Is the name MindPin free on the App Store, Google Play, and as a trademark in the launch market?
- [x] Should sign-in be optional as assumed, or required? Required at first launch (see Clarifications).
- [x] Is Facebook login worth the extra review and maintenance work for v1? No, dropped for v1.
- [ ] What is the unlock price?

## Requirements

Criteria use the form "WHEN something happens, the app SHALL do something" so each one can become a test.

### R1. Save from the share menu

As a user, I want to share a location from any app into MindPin so that I can save it without leaving the conversation.

1. WHEN the user shares text or a link from another app, MindPin SHALL appear in the system share menu on Android and iOS.
2. WHEN MindPin receives a share, it SHALL open a save sheet over the current app within 2 seconds.
3. WHEN the user taps Save, the place SHALL be stored and the sheet SHALL close, returning the user to the original app.
4. WHEN the shared content contains no recognizable location, the sheet SHALL say so and offer two choices: Save as note (R10.9), or Enter address, which saves a place at the address the user types and keeps the shared text.
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
7. WHEN the user picks a device contact that is already linked to a person in MindPin (same contact ID), the app SHALL use that person instead of creating a new one.
8. WHEN the user types a name that exactly matches an existing person (ignoring case), the app SHALL show that person first and let the user pick them or create a new person; the app SHALL NOT merge people automatically.
9. WHEN a backup is restored on a new phone and contacts permission is granted, the app SHALL re-link people to device contacts by matching phone number; people with no match SHALL keep their saved name, phone, and places.
10. WHEN a person has a saved phone number, the person screen SHALL offer Call, which opens the phone dialer, and Message, which opens WhatsApp if installed and SMS otherwise.
11. A place SHALL be savable without a person; it then appears in the Places view and in search, but under no person.
12. The user SHALL be able to edit a person's name and phone number from the person screen. The name SHALL be required, and a phone number, when given, SHALL be a valid number. The app SHALL NOT change the phone's address book.
13. The user SHALL be able to delete a person, with a confirmation before deleting. The person's places and notes SHALL be kept and SHALL lose only their link to the person. The app SHALL NOT change the phone's address book.

### R4. Places, labels, and notes

As a user, I want to label places and keep practical notes so that I have what I need on arrival.

1. Each place SHALL have a label chosen from Home, Office, Shop, or a custom label.
2. Each place SHALL accept free-text notes and quick tags (for example gate code, floor, parking).
3. A person SHALL be able to have any number of places.
4. The user SHALL be able to edit or delete a place, with a confirmation before deleting.
5. WHEN the user taps Navigate, the app SHALL open the place in the user's preferred maps app.
6. WHEN the user taps Share, the app SHALL produce a maps link and the address as text for the system share menu.
7. The user SHALL be able to add a place without a share, from the person screen or the Places view, by typing an address or pasting a link; the same save sheet SHALL open.
8. WHEN the user taps Share places on a person screen, the app SHALL produce one text listing each of that person's places with its label, address, and maps link.
9. WHEN a place is deleted, it SHALL disappear from every list, the map, and search, together with its visits. Notes linked to it SHALL be kept and SHALL lose only their link to the place.
10. Editing a place SHALL allow changing its label, address, notes, and tags. WHEN the address of a place with a pin is changed, the pin SHALL stay where it is. WHEN the address of a place with no pin is changed, the app SHALL look up its location again. A place with no pin SHALL keep an address.

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
5. The app SHALL have a bottom bar with Home, Map, and Settings. The home screen SHALL have a floating + button that offers New note and Add place. The home screen search bar SHALL be plain text search with no microphone; Ask MindPin SHALL NOT appear in v1.

### R7. Account and sign-in

As a user, I want to sign in once when I first open the app so that my account is ready for backup and restore.

1. On first launch, the app SHALL require sign-in before showing any other screen; there SHALL be no option to continue without an account. Internal test builds MAY skip sign-in behind a build flag; store builds SHALL NOT.
2. The app SHALL support sign-in by phone number with a 6-digit SMS code, by Google, by an email sign-in link with no password, and on iOS by Sign in with Apple.
3. WHEN an SMS code is entered incorrectly 5 times, the app SHALL require a new code.
4. The user SHALL be able to resend the code after 60 seconds.
5. The user SHALL be able to sign out and to delete the account with all backed-up data.
6. WHEN a share arrives before the user has ever signed in, the app SHALL keep the shared content until sign-in completes, then open the save sheet with it before any other first-launch step. On Android the app SHALL show sign-in straight away. On iOS, where a share extension cannot open the app, the extension SHALL store the share and tell the user to open MindPin to sign in; the app SHALL then show sign-in and open the stored share.
7. WHEN the SMS code arrives on the device, the app SHALL fill it in automatically.
8. After the first sign-in, the app SHALL ask once for the user's first name, pre-filled from Google when available; the user SHALL be able to skip, and the home greeting SHALL then omit the name. WHEN a held share is waiting (R7.6), the prompt SHALL appear after that share is saved.
9. The welcome screen SHALL describe only v1 features (places and notes).

### R8. Privacy and backup

As a user, I want my contacts' addresses kept private so that I can trust the app with them.

1. All places, notes, and visits SHALL be stored on the device.
2. Backup SHALL turn on automatically when the user signs in, and the sign-in screen SHALL say so. Data SHALL be encrypted on the device before upload. The user SHALL be able to turn backup off in Settings, which SHALL stop further uploads.
3. WHEN a signed-in user installs the app on a new phone, the app SHALL offer to restore the latest backup.
4. The app SHALL offer an export of all data as a file.
5. The app SHALL NOT track location in the background in v1.
6. The backup key SHALL be generated on the device, saved in the platform's synced keychain (iCloud Keychain on iOS, Google Block Store on Android), and SHALL NOT be sent to the MindPin server.
7. WHEN backup first turns on, the app SHALL show a one-time recovery code and ask the user to keep it; WHEN a held share is waiting (R7.6), the code SHALL be shown after that share is saved. WHEN a restore cannot find the key in the keychain (for example after switching between Android and iOS), the app SHALL ask for the recovery code, and SHALL explain that without the key or code the backup cannot be read.
8. WHILE backup is on, the app SHALL upload 5 minutes after the last change, on Wi-Fi or mobile data, sending all changes since the previous upload in one batch. WHEN the device is offline or the system blocks background work, the upload SHALL run on the next connection or the next app open.

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
9. WHEN text with no location is shared into MindPin from another app, the save sheet SHALL offer "Save as note" (the same choice as R1.4).
10. WHEN a note is deleted, it SHALL disappear at once and an Undo button SHALL be shown for 5 seconds while the user stays on the same screen. WHEN the user taps Undo, the note SHALL return unchanged. WHEN the 5 seconds pass or the user leaves the screen, the note SHALL be removed permanently. There SHALL be no Recently Deleted list.
11. Swiping a note in the list SHALL offer pin, link, and delete, and the same actions SHALL be available from a long-press menu.
12. Standalone notes SHALL NOT count toward the 25-place free limit.

Folders, locked notes, drawings, and attachments are left out of v1; people, places, pins, and search do the organizing.

### R11. Appearance

Added on 2026-11-28 at the owner's request.

1. The app SHALL follow the phone's light or dark setting, and SHALL change with it while the app is open, unless the user has chosen a theme (R11.6).
2. The dark theme SHALL use warm dark backgrounds with an orange accent (`#D97757`); the light theme SHALL stay as designed in Figma.
3. In both themes, text SHALL have a contrast of at least 4.5:1 against its background.
4. A screen with nothing to show yet (Home on a new install, Notes with no notes, Map with no pins, a search with no results) SHALL show a small animated illustration above its message.
5. WHEN the phone is set to reduce motion, the illustration SHALL be still.
6. The user SHALL be able to choose Light, Dark, or Same as phone in Settings, and to switch between light and dark with one tap from Home. The choice SHALL be remembered.

## Non-functional requirements

| Area | Requirement |
| --- | --- |
| Speed | Save from the share menu completes in under 10 seconds after first-time setup; save sheet opens within 2 seconds of sharing; a new note opens within 1 second; search results within 300 ms; cold start under 3 seconds on a mid-range Android phone |
| Offline | First sign-in needs a connection; after that, every v1 feature except short-link resolution, address lookup, map tiles, sign-in, backup, purchases, and account deletion works with no connection; offline, maps show the address instead |
| Privacy | No analytics containing addresses, coordinates, or contact names; contacts are read only on the device |
| Security | Backups encrypted before upload; auth tokens kept in the platform's secure storage |
| Reliability | No data loss if the app is closed mid-save; database changes use migrations |
| Accessibility | Touch targets at least 44 px; text contrast at least 4.5:1; screen reader labels on all buttons |
| Languages | English in v1; all text in translation files so Urdu can be added, including right-to-left layout |
| Store rules | Permission prompts explain their purpose; account deletion is available in the app; Sign in with Apple is offered on iOS (R7.2) |
| Testing | Unit tests for the link parser and database layer; one end-to-end test per requirement R1 to R6 |
