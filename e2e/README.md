# End-to-end tests

Flows run with [Maestro](https://maestro.mobile.dev) against a development build on an Android
emulator or device. One flow per requirement R1 to R6 (constitution, Principle V).

## Setup

1. Install the Maestro CLI (it is not an npm package): see the Maestro install guide.
2. Start an Android emulator.
3. Build and install the app: `npx expo run:android`.

## Run

- All flows: `npm run e2e`
- One flow: `maestro test e2e/smoke.yaml`

Flows must not print or assert on real addresses, coordinates, contact names, or phone numbers;
use the seeded test data only.
