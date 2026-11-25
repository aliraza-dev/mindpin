# MindPin v1: Design

MindPin is local-first: the phone's database is the source of truth, and the backend exists only for sign-in and encrypted backup.

## Components

| Component | Responsibility | Technology (assumed) |
| --- | --- | --- |
| App shell | Screens, navigation, state | React Native, Expo, TypeScript, Expo Router |
| Share target | Receives shared text and links, opens the save sheet | iOS Share Extension, Android intent filter (ACTION_SEND text/plain) |
| Link parser | Turns shared content into coordinates and an address | Pure TypeScript module, fully unit tested |
| Local database | Stores people, memories, visits | SQLite with full-text search (FTS5) |
| Contacts bridge | Reads contacts on request, never uploads them | expo-contacts |
| Maps | Map preview, pin map, address lookup | react-native-maps, platform geocoder |
| Auth | Phone (SMS code with auto-fill), Google, email sign-in link, Sign in with Apple on iOS | Supabase Auth |
| Backup | Encrypts the database and uploads it | AES-256 on device, Supabase Storage |
| Backup key | Generates and keeps the backup key; the server never sees it | iCloud Keychain (synchronizable item) on iOS, Google Block Store on Android; recovery code as fallback |
| Purchases | One-time unlock | RevenueCat or platform billing |

## Save flow

1. The user shares a location from a chat app and picks MindPin.
2. The share target passes the raw text to the link parser.
3. The parser returns coordinates, an address, and a confidence level, or a "not found" result.
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
| lat, lng | real | Optional; required for `place` once resolved |
| address | text | Readable address |
| notes | text | Free text; for a note, the body as Markdown with checklists as task items |
| tags | text (JSON array) | Quick tags such as gate code |
| pinned | integer | 0 or 1; used by notes |
| source_app | text | For example WhatsApp |
| source_raw | text | Original shared text, kept for re-parsing |
| status | text | `resolved` or `pending_resolve` (offline short link) |
| payload | text (JSON) | Type-specific data for later types |
| created_at, updated_at, deleted_at | integer | Soft delete supports backup merge; deleted notes are purged 30 days after `deleted_at` |

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

The note editor is a rich-text component that reads and writes Markdown.

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

Taken from the current app designs. Confirm against the Figma file before building each screen.

| Token | Value |
| --- | --- |
| Background | `#F6F7F4` |
| Surface | `#FFFFFF` |
| Text | `#14171F` |
| Muted text | `#5B6170` |
| Border | `#E6E8E2` |
| Accent | `#0F766E` |
| Heading font | Space Grotesk (600, 700) |
| Body font | Inter (400, 500, 600) |
| Corner radius | 14 to 18 px for cards and fields, 16 px for main buttons |
| Screen padding | 20 px sides |
| Minimum touch target | 44 px |
