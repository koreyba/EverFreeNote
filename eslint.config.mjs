import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import { createRequire } from 'node:module';
import globals from 'globals';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

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
      'ui/mobile/**', // Ignore mobile project
      'supabase/functions/**', // Deno runtime — not compatible with Node.js TypeScript rules
    ],
  },
  
  // Additional rules
  {
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
    },
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
  
  // Override for Node.js scripts (CommonJS)
  {
    files: ['scripts/*.js', 'build/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },

  // Override for Jest config/setup files in CommonJS
  {
    files: ['jest.config.cjs', 'tests/jest/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
]);

