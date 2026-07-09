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
      // NOTE: `consistent-type-imports` is intentionally NOT enabled — NestJS relies on
      // emitted decorator metadata, so injected constructor parameter types must be VALUE
      // imports. Forcing `import type` there would break dependency injection at runtime.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    // CommonJS tooling/config files (e.g. webpack.config.js).
    files: ['**/*.{js,cjs}'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
