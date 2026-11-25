// Tests live next to source (foo.ts beside foo.test.ts).
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src', '<rootDir>/modules'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
};
