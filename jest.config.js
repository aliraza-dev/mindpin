// Tests live next to source (foo.ts beside foo.test.ts).
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src', '<rootDir>/modules'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  // Every worker loads React Native, which takes a few hundred MB. One worker per core runs a
  // machine with little free memory out of it, and screen tests then time out. Half the cores,
  // with a longer limit for the first screen test in a file, keeps the full run reliable.
  maxWorkers: '50%',
  testTimeout: 20000,
};
