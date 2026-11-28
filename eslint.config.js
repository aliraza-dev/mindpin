// Uses CommonJS because ESLint loads this file directly.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'android/**',
      'ios/**',
    ],
  },
  {
    // Named exports only (CLAUDE.md). Expo Router route files in app/ are the exception.
    files: ['src/**/*.{ts,tsx}', 'modules/**/*.{ts,tsx}'],
    rules: {
      'import/no-default-export': 'error',
    },
  },
  {
    // Personal data must never be logged (constitution II); only the privacy-safe logger may print.
    files: ['**/*.{ts,tsx,js}'],
    ignores: ['src/lib/log.ts', 'eslint.config.js', 'jest.config.js'],
    rules: {
      'no-console': 'error',
    },
  },
  {
    // No dynamic code (design.md, Security rules).
    files: ['**/*.{ts,tsx,js}'],
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
    },
  },
]);
