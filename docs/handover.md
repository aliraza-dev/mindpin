# Handover notes

Written 2026-11-27. Branch `feat/v1-foundation`, last code commit `45e736b`.

Read `CLAUDE.md` and `docs/spec/` first. The spec is the source of truth and `docs/spec/tasks.md` is the work queue. These notes only cover what those files do not say: where the build stands, what has never been checked, and what is waiting on the owner.

## Where the build stands

80 of 144 tasks are ticked. On this machine `npm test` passes (502 tests in 62 suites), and `npx tsc --noEmit` and `npm run lint` are clean.

Built and tested in Jest:

- The link parser, the database with migrations and search, and the retry queue for lookups.
- Home, Person and Place screens, with their data.
- Editing and deleting a place, editing and deleting a person (the "⋯" menu on the Place screen, the pencil on the Person screen).
- The contact picker ("Whose place is this?").
- The save sheet, and adding a place by hand (paste a link or type an address, then the same sheet).

Not built yet, in the order `tasks.md` gives them:

- Sharing into MindPin: the Android share target (T047) and the iOS share extension (T048). Until these exist, the only way into the save sheet is adding a place by hand.
- The map of all pins (T064).
- Notes: editor, list, undo, linking (T068 to T080).
- Visits (T085 to T090).
- Sign-in (T092 to T105), backup and export (T106 to T122), the purchase limit (T123 to T128).
- The release passes (T129 to T137).

## The app has never run on a device

This is the biggest gap. Everything above is verified by tests and by exporting the Android JavaScript bundle. Nothing has been compiled natively or opened on a phone or emulator.

- This Windows laptop has no Android SDK and no Xcode, and too little free memory for a local Android build.
- The native address lookup module (`modules/place-geocoder`) and the map (`react-native-maps`) have never been compiled. Expect the first build to need fixes. T139 and T140 stay open until both are seen working on an Android and an iOS device.
- The end-to-end flows in `e2e/` (T035, T055, T073, T085) have not been run for the same reason.

The owner agreed on 2026-11-28 to build in the cloud with EAS Build and install on their Android phone. The setup is in the repository: `expo-dev-client`, and `eas.json` with one development profile that skips sign-in (the store profiles are still T137). The module's Kotlin and Swift files were being ignored by git and are now committed, so the build can see them. What is left:

1. The owner runs `npx eas-cli login`, `npx eas-cli init`, then `npx eas-cli build --profile development --platform android`, and installs from the link. `eas init` cannot write to `app.config.js`; the project id it prints goes in `app.json` under `expo.extra.eas.projectId`.
2. Fix whatever the first build log shows, then run `npx expo start --dev-client` on the laptop and open the app on the phone.

Advise the owner to turn on two-factor sign-in for the Expo account, download a copy of the Android signing key, and keep the install link private.

## Waiting on the owner

- **Go-ahead for EAS Build**, as above.
- **Google Maps key.** It goes in `.env` as `GOOGLE_MAPS_ANDROID_KEY`, and later as an EAS secret. Until it is set, the build uses a stand-in value and the app shows the address instead of the map. The owner also needs to add the line `GOOGLE_MAPS_ANDROID_KEY=` to `.env.example` by hand, because the assistant is not allowed to read or write `.env` files. The key must be locked to the app in the Google console.
- **A sample live-location share** for T138 (finding U4 in the spec).
- **Figma frames.** Frames 15 to 21 were drawn from the code on 2026-11-27 for the screens already built; the owner has not reviewed them. Frames for the screens not built yet (Settings, unlock, recovery code and restore, map, search results, the Undo bar, "Did you visit?", the name prompt) are still missing: the Figma plan's tool-call limit was reached before they could be drawn.

## Decisions the owner has made

All of these are recorded in `docs/spec/requirements.md` under "Decisions during the build (2026-11-27)". The ones most likely to be asked about again:

- Deleting a person keeps their places and notes, with no person attached.
- Deleting a place keeps its linked notes, unlinked.
- Editing a place never moves its pin.
- Screens with no Figma frame are built from the styles of the existing frames instead of waiting. So far: the edit forms, the add-a-place screen, the menus. `tasks.md` lists them in its notes. Say so in any report that includes one.
- Security best practice applies to every task: typed text has length limits, unused Android permissions are blocked, the maps key is locked to the app.

## Open design points raised but not settled

These work today, but the owner has not confirmed them:

- The save sheet's label starts on Home.
- When a place is saved near an existing one, it is saved as new unless the user taps Update.
- Tags are typed as a comma-separated list.
- The map pin is the standard one, tinted teal.
- The edit form cannot move a place to another person.
- A deleted person leaves no marker behind, which will matter when backups from two devices are merged (finding U1).

## Working on this machine

- Long Bash heredocs fail to parse here. Write files with the editor tool and run scripts from a temporary folder.
- Jest is capped at half the cores with a 20-second timeout (`jest.config.js`). With more workers the machine runs out of memory and heavy screen tests time out.
- `StyleSheet.absoluteFillObject` is gone in this React Native version. Use `StyleSheet.absoluteFill`.
- In tests, elements hidden from screen readers (the map, contact photos) need `{ includeHiddenElements: true }`.
- `.claude/settings.json` has a local change that is left uncommitted on purpose.
- `npm audit` shows no high or critical findings, and 22 moderate ones in build tools.

## Added on 2026-11-28

- The app runs on the owner's Android phone from an EAS development build. Code changes reach it through `npx expo start --dev-client` with no rebuild, as long as no native package is added.
- `expo-blur` was added for the frosted bottom bar. The blur shows only in a development build made after that (`npx eas-cli build --profile development --platform android`); the earlier build still runs and shows the bar without blur. The blurred bar has not been seen on a phone.
- Built and tested in Jest: adding a place from Home, the Notes list, the note editor, linking a note, Undo after deleting a note, the map of all pins, the "Did you visit?" question, the dark theme (R11), and the animated pictures on empty screens.
- Not yet seen on a phone, and the most likely to need fixes there: typing in the note editor (it uses one text field per line, with bold and italic drawn inside the field), the sideways swipe on a note, and the dark theme's colors. The dark colors were chosen without a Figma frame.
- Still a placeholder: Settings, which waits for sign-in, backup, and export. Visit notes (part of T089) are shown but cannot be typed yet.
- The Notes and Note editor screens were built without reading their Figma frames, because the Figma plan's tool-call limit was reached. Compare them with frames "06 Notes" and "07 Note editor" when the limit resets.
- The findings from the owner's code review of 2026-11-27 are still open except the first (the module's native code is now committed).

## Suggested next step

Get the app onto the owner's phone with EAS Build, then build the Android share target (T047). Sharing from WhatsApp is the core of the product and cannot be judged without both.
