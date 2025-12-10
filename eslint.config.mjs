import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load Next.js configs (which are now Flat Config arrays in v16)
const nextCoreWebVitals = require('eslint-config-next/core-web-vitals');
const nextTypescript = require('eslint-config-next/typescript');

export default defineConfig([
  // Base config
  js.configs.recommended,
  
  // Next.js configs
  ...nextCoreWebVitals,
  ...nextTypescript,
  
  // Global ignores
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'act-artifacts/**',
      'out/**',
      'next-env.d.ts',
    ],
  },
  
  // Override for UI components
  {
    files: ['components/ui/*.tsx'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  
  // Override for Cypress files
  {
    files: [
      'cypress/**/*.js',
      'cypress/**/*.ts',
      'cypress/**/*.jsx',
      'cypress/**/*.tsx',
      'cypress.config.ts',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  
  // Override for scripts and types
  {
    files: ['scripts/*.ts', 'types/*.d.ts', 'db_audit_scripts/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);

