# MindPin v1: Design

MindPin is local-first: the phone's database is the source of truth, and the backend exists only for sign-in and encrypted backup. Purchases go through the app stores.

## Components

| Component | Responsibility | Technology (assumed) |
| --- | --- | --- |
| App shell | Screens, navigation, state | React Native, Expo, TypeScript, Expo Router |
| Share target | Receives shared text and links, opens the save sheet | iOS Share Extension, Android intent filter (ACTION_SEND text/plain) |
| Link parser | Turns shared content into coordinates and an address | Pure TypeScript module, fully unit tested |
| Local database | Stores people, memories, visits | SQLite with full-text search (FTS5) |
| Contacts bridge | Reads contacts on request, never uploads them | expo-contacts |
| Maps | Map preview, pin map | react-native-maps: Google Maps on Android (needs the key `GOOGLE_MAPS_ANDROID_KEY` when the app is built), Apple Maps on iOS (no key). Shown only when the key is set, the phone is online, and the place has a pin; otherwise the address stands in. A build with no key carries a stand-in value that cannot load a map, so a map view can never crash the app |
| Address lookup | Turns coordinates into an address and an address into coordinates, without asking for the location permission | Local native module `modules/place-geocoder`: Android `Geocoder`, iOS `CLGeocoder` |
| Auth | Phone (SMS code with auto-fill), Google, email sign-in link, Sign in with Apple on iOS | Supabase Auth |
| Backup | Encrypts the database and uploads it | AES-256 on device, Supabase Storage |
| Backup key | Generates and keeps the backup key; the server never sees it | iCloud Keychain (synchronizable item) on iOS, Google Block Store on Android; recovery code as fallback |
| Purchases | One-time unlock | RevenueCat or platform billing |

## Save flow

1. The user shares a location from a chat app and picks MindPin.
2. The share target passes the raw text to the link parser.
3. The parser returns coordinates with their source, a short link to resolve, text that may be an address, or a "not found" result.
4. The save sheet shows a map preview and suggests people.
5. The user picks a person, label, and notes, then taps Save.
6. The app writes the memory to SQLite and updates the search index.
7. The sheet closes and the user is back in the chat app.

## Data model

Places and notes are stored as a generic memory item so receipts, voice notes, and photos can be added later as new types without a rewrite.

### person

| Field | Type | Notes |
| --- | --- | --- |
| id | text (UUID) | Primary key |
| name | text | Required |
| phone | text | Optional |
| contact_ref | text | Device contact ID, optional; unique among people when set; device-specific, so re-linked by phone number after restore |
| photo_uri | text | Optional |
| created_at, updated_at | integer | Unix ms |

### memory

| Field | Type | Notes |
| --- | --- | --- |
| id | text (UUID) | Primary key |
| type | text | `place` and `note` in v1; later `receipt`, `voice`, `photo` |
| person_id | text | Optional link to person |
| place_id | text | Optional link from a note to a saved place |
| title | text | Label such as Home or Shop; for a note, its first line |
| lat, lng | real | Optional; null for an address-only place whose address lookup found no match (R2.4) |
| address | text | Readable address |
| notes | text | Free text; for a note, the body as Markdown with checklists as task items |
| tags | text (JSON array) | Quick tags such as gate code |
| pinned | integer | 0 or 1; used by notes |
| source_app | text | For example WhatsApp |
| source_raw | text | Original shared text, kept for re-parsing |
| status | text | `resolved`, `pending_resolve` (short link waiting for a connection), or `pending_geocode` (waiting for a connection to look up the address for known coordinates, or the coordinates for a known address) |
| payload | text (JSON) | Type-specific data for later types |
| created_at, updated_at, deleted_at | integer | Soft delete supports backup merge. For a note, `deleted_at` is set only while its Undo button is showing: Undo clears it, and otherwise the row is removed when the 5 seconds end, when the user leaves the screen, or at the next app start |

### visit

| Field | Type | Notes |
| --- | --- | --- |
| id | text (UUID) | Primary key |
| memory_id | text | The place visited |
| visited_at | integer | Unix ms |
| note | text | Optional |
| source | text | `manual` or `navigate_confirm` |

### setting

| Field | Type | Notes |
| --- | --- | --- |
| key | text | Primary key, for example `user_first_name` |
| value | text | Included in backup |

A full-text index covers person name, title, address, notes, and tags.

The note editor is a rich-text component that reads and writes Markdown. It is built in the app, with no native package: one text field per line, so a line can be a title, a heading, a bulleted or numbered item, or a checklist item with a circle to tap. Bold and italic are shown in place with their Markdown marks drawn faintly. A new note has no row until the first keystroke, and a note left empty is not kept.

### Limits on typed text

Every typed field is trimmed and has a limit, enforced in the form and again before it is written.

| Field | Limit |
| --- | --- |
| Place label | 1 to 40 characters |
| Address | 300 characters; required when the place has no pin |
| Place notes | 2,000 characters |
| Tags | up to 10, each 1 to 40 characters, no duplicates (ignoring case); typed separated by commas |
| Person name | 1 to 100 characters |
| Phone number | up to 20 characters, holding 3 to 15 digits; only digits, spaces, `+`, `-`, and brackets |
| Note | 20,000 characters for the whole note; the editor refuses more and says so |

### Deleting a place

Deleting a place sets `deleted_at` on it (kept for backup merge) and, in the same transaction, clears `place_id` on the notes linked to it. Its visits stay in the table and are never shown again.

### Deleting a person

Deleting a person removes the `person` row for good, so the name, phone number, and contact link are no longer stored. In the same transaction `person_id` is cleared on every memory that pointed to the person, deleted ones included. The places and notes themselves are untouched. Nothing is kept to tell another phone about the deletion; merging backups from several phones (open finding U1) will have to cover it.

## Link parser rules

| Input | Example pattern | How coordinates are found |
| --- | --- | --- |
| Google Maps full link | `google.com/maps/...@lat,lng` or `?q=lat,lng` | Read from the URL |
| Google Maps short link | `maps.app.goo.gl/...` | Follow the redirect, then parse the full link |
| Apple Maps link | `maps.apple.com/?ll=lat,lng` | Read the `ll` parameter |
| WhatsApp location | Text containing a maps link with `?q=lat,lng` | Read from the URL |
| Geo link | `geo:lat,lng` | Read directly |
| Plain coordinates | `31.5204, 74.3587` | Regex with range check |
| Address only | Free text | Geocode; save as text if no match |

The parser is a pure function, `parseShared(text) -> ParsedLocation`, so every format has unit tests and new formats are added without touching the UI.

## Ask MindPin (phase 2, designed for now)

In phase 2 each memory gets an embedding, a question retrieves the closest memories, and a language model answers with the source items shown. v1 only needs the `memory` table and `source_raw` field above to be ready for it.

## Visual design tokens

Taken from the app designs in Figma: https://www.figma.com/design/XSdu6UPBCstIuQrupkXPl1/Untitled (page "app flow"). Confirm against the matching frame before building each screen; if a screen has no frame, or its frame contradicts the spec, stop and ask.

| Token | Value |
| --- | --- |
| Background | `#F6F7F4` |
| Surface | `#FFFFFF` |
| Text | `#14171F` |
| Muted text | `#5B6170` |
| Border | `#E6E8E2` |
| Accent | `#0F766E` |
| Heading font | Space Grotesk (600, 700) |
| Body font | Inter (400, 500, 600, 700) |
| Corner radius | 14 to 18 px for cards and fields, 16 px for main buttons |
| Screen padding | 20 px sides |
| Minimum touch target | 44 px |

More values read from the Home, Person, and Place frames on 2026-11-27:

| Token | Value |
| --- | --- |
| Secondary text | `#4A5060` |
| Control border (fields, chips, outline buttons) | `#DCDFD8` |
| Divider and neutral tag | `#EEF0EB` |
| Teal tint, with its text | `#D7EDE9` (avatars), `#E3F2EF` (badges, tiles); text `#0B5A54` |
| Amber tint, with its text | `#F6E3CF`; text `#8A4B0F`, and `#6E3B0B` on a tag |
| Indigo tint, with its text | `#E2E4F3`; text `#3A3F86` |
| Dark card | background `#14171F`, text `#FFFFFF`, muted text `#C9CCD4`, action `#F2B66D` |
| Inactive dot | `#C9CCC4` |
| Map placeholder | `#E3E8DD` |
| Radii | buttons 14, large action buttons 16, cards 18, filter chips 18, tags 10, badges 8, sheet top 24 |
| Sizes | buttons 44 high, large action buttons 64, filter chips 36 (touch area still 44), avatars 44 and 84, back button 46 |

Values read from the Save sheet and Person frames on 2026-11-27, used by the edit forms:

| Token | Value |
| --- | --- |
| Form title | Space Grotesk 700, 22 px |
| Text link (Cancel) | Inter 400, 15 px, accent |
| Field label | Inter 700, 13 px, text color |
| Field | 46 px high, radius 14, white, 1 px control border; 2 px accent border while typing; text Inter 400, 15 px |
| Main form button | 54 px high, radius 16, accent, label Inter 700, 16 px, white |
| Round icon button (edit) | 44 px, white, 1 px border |

Values read from the Save sheet frame for the sheet itself:

| Token | Value |
| --- | --- |
| Backdrop behind the sheet | `#3B3F47`; text on it `#D5D8DE`; shared-text bubble `#5A5F69` with text `#F1F2F4`, radius 14 |
| Sheet | background color, top corners 28; handle 40 by 5, `#C9CCC4` |
| Location card | white, 1 px border, radius 16; map thumbnail 88 by 72, radius 12 |
| Suggestion list | white, 1 px border, radius 14; rows 52 high; picked row `#E3F2EF` with a check; photo or initials 32 px |

The edit forms and the "⋯" menu were built from these values before they had frames. Frames 15 to 21 were then drawn from the code on 2026-11-27 ("15 Edit place", "16 Edit person", "17 Add a place", "18 Place menu", and three save sheet states), so they record what was built and are not yet an owner-approved design. The "⋯" icon is drawn to match the edit button.

Icons are the SVG files exported from the frames, kept in `assets/icons/`. A label without an icon in Figma (Office, custom) shows its first letter until one is drawn.

### Dark theme (R11)

There is no Figma frame for the dark theme; these values were chosen on 2026-11-28 and need the owner's review. Every color token has a light and a dark value, and components read them through `src/ui/theme.ts`, never directly. The theme follows the phone's setting; a switch in Settings can be added with that screen.

| Token | Dark value |
| --- | --- |
| Background | `#1F1E1D` |
| Surface | `#2B2A27` |
| Text | `#F5F4EF` |
| Muted text | `#A8A69D` |
| Secondary text | `#C2C0B6` |
| Border, control border, divider | `#3A3936`, `#4A4945`, `#353431` |
| Accent | `#D97757` (orange); text on it `#1F1E1D` |
| Accent tint, with its text | `#4A2E22` (avatars), `#3A2A22` (badges, picked rows); text `#F0A98C` |
| Amber tint, with its text | `#4A3A1E`; text `#F2C078` |
| Indigo tint, with its text | `#2F3150`; text `#B9BDF2` |
| Raised card (the dark card of the light theme) | `#3A3936`, text `#F5F4EF`, muted text `#C2C0B6`, action `#F2B66D` |
| Inactive dot, map placeholder | `#5A5954`, `#2F3A2C` |

Two tokens exist so the same component works in both themes: text on the accent color (white in light, `#1F1E1D` in dark, because white on orange fails the contrast rule) and text on the dark card.

Not themed yet: the round back, edit, and more buttons and the place tiles are drawn whole in their icon files and keep their light look, and the map keeps the map maker's light style.

### Empty screens (R11.4)

The illustrations are drawn in code from the theme colors (`src/ui/EmptyIllustration.tsx`), with no image files and no animation package: a pin that bobs over its shadow (places, map), a sheet whose lines write themselves (notes), and a magnifying glass that sweeps (search). Each is 120 px high, decoration only, and hidden from screen readers; the message under it carries the meaning.

## Security rules

These apply to every task. They sit beside the privacy rules in the constitution (Principle II).

| Rule | How it is met |
| --- | --- |
| Treat everything from outside the app as untrusted | Shared text, links, screen addresses (deep links), and contact fields are validated before use. Shared text is read up to a fixed length. Screen addresses must carry a well-formed id, and an unknown id shows "not found" |
| A link opened from outside never changes data | Opening a `mindpin://` link can only show a screen. Deleting, saving, sharing, calling, and messaging always need a tap inside the app |
| Links the app opens are built, never passed through | Maps, phone, SMS, and WhatsApp links are assembled from sanitized values: phone numbers keep digits and a leading + only (so a contact cannot carry dial codes), and text is URL-encoded |
| The network is used only for known hosts over https | Short links are requested only when they belong to a known map service; anything else is never fetched |
| Database queries never contain user text | Every query passes values as parameters |
| Personal data never reaches logs | Only the logger may print, and it accepts event names and an allow-list of fields |
| Data leaves the phone only through MindPin's encrypted backup | Android's own app backup is turned off (`allowBackup: false`), so the database is not copied to Google Drive outside that encryption |
| Sharing shows only what the user would expect | Shared text holds a label, address, and maps link, never notes or tags |
| Permissions are the minimum | A new package's permissions are checked before it is installed; unused ones are blocked in `app.json`. The location permissions are blocked outright, so no package can add them |
| Typed text is bounded | Every form field is trimmed and checked against the limits in "Limits on typed text" before it is written |
| The maps key is locked to this app | A Google Maps key ships inside every Android app that uses it, so it cannot be kept secret. It is restricted in the Google Cloud console to MindPin's package name and signing certificate, and to the Maps SDK for Android only. It is read from `.env` when the app is built and is never committed |
| Secrets stay out of the repo and the app | `.env` files are not committed. Only public client keys may use the `EXPO_PUBLIC_` prefix, because those are bundled into the app |
| Dependencies are checked | `npm audit` is run when dependencies change; high or critical findings in shipped code block a release |
| No dynamic code | `eval` and similar are lint errors; the app has no web views |
