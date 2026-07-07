import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Legacy apps keep their own (Angular/tslint) tooling; generated + build output excluded.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'legacy-client/**',
      'backend/**',
      '**/*.json',
      'packages/contract/openapi.json',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
);
