// Extends app.json. MINDPIN_SKIP_SIGN_IN=1 is set only for the internal tester build (R7.1);
// store build profiles must never set it.
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    skipSignIn: process.env.MINDPIN_SKIP_SIGN_IN === '1',
  },
});
