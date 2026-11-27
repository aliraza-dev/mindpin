// Extends app.json with values that come from the environment when the app is built.

// The Google Maps key for Android (design.md: Maps). It is read from `.env` and never
// committed. Like every maps key it ends up inside the built app, so it must be restricted in
// the Google Cloud console to this app's package name and signing certificate.
const androidMapsKey = (process.env.GOOGLE_MAPS_ANDROID_KEY ?? '').trim();

// A map view crashes the app when the build carries no key at all. So a build without a key
// still gets this stand-in, which cannot load any map, and the app is told (below) not to
// show the map. iOS uses Apple Maps and needs no key.
const KEY_NOT_SET = 'GOOGLE_MAPS_KEY_NOT_SET';

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', { androidGoogleMapsApiKey: androidMapsKey || KEY_NOT_SET }],
  ],
  extra: {
    ...config.extra,
    // MINDPIN_SKIP_SIGN_IN=1 is set only for the internal tester build (R7.1); store build
    // profiles must never set it.
    skipSignIn: process.env.MINDPIN_SKIP_SIGN_IN === '1',
    // Only whether a key was given, never the key itself.
    androidMapsKeySet: androidMapsKey.length > 0,
  },
});
