import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import pluginReact from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Legacy code
  {
    files: ['src/app/legacy/**/*.jsx'],
    plugins: { react: pluginReact },
    extends: [js.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.browser,
        React: 'readonly',
        ReactDOM: 'readonly',
        ReactBootstrap: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/jsx-no-undef': 'off',
      'react/prop-types': 'off',
      'react/no-deprecated': 'off',
    },
    settings: { react: { version: '16.14' } },
  },

  eslintConfigPrettier,
]);
