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
      'allure-results/**',
      'allure-report/**',
      '.tmp-artifacts/**',
      '.worktrees/**',
      '.claude/worktrees/**', // In-repo agent worktrees must not affect lint runs
      'act-artifacts/**',
      'out/**',
      'next-env.d.ts',
      'ui/shell/www/**', // Generated: staged copy of the web build
      'ui/shell/android/**', // Generated: native project from `cap add android`
      'supabase/functions/**', // Deno runtime — not compatible with Node.js TypeScript rules
      '.scannerwork/**',
      '.sonarlint/**',
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
  
  // The web bundle also runs inside the Android shell (ui/shell), where two browser
  // assumptions silently break: the serving origin is https://localhost, which nobody
  // outside the app can open, and an <a download> click produces no file, no prompt and
  // no error. Both shipped as real bugs before these rules existed. Route such work
  // through ui/web/adapters instead, which pick the right behaviour per platform.
  {
    files: ['app/**/*.{ts,tsx}', 'ui/web/**/*.{ts,tsx}', 'core/**/*.{ts,tsx}'],
    ignores: ['**/tests/**', 'ui/web/adapters/publicWebOrigin.ts', 'ui/web/adapters/fileDownload.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[property.name='origin'][object.name=/^(location|window|globalThis|document)$/], MemberExpression[property.name='origin'][object.property.name='location']",
          message:
            'The serving origin is https://localhost inside the Android shell. Use resolvePublicWebOrigin() from @ui/web/adapters/publicWebOrigin for anything a person outside the app will open, or disable this rule with a comment saying why an internal comparison is safe.',
        },
        {
          selector: "AssignmentExpression[left.property.name='download']",
          message:
            'A download-attribute anchor click does nothing in an Android WebView — no file, no prompt, no error. Use downloadGeneratedFile() from @ui/web/adapters/fileDownload.',
        },
      ],
    },
  },

  // Override for Node.js scripts (CommonJS)
  {
    files: ['scripts/*.js', 'build/*.js', 'ui/shell/scripts/*.js'],
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
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
]);

