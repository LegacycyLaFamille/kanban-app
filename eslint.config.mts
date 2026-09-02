import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'src/static/js/babel.min.js',
      'src/static/js/react-bootstrap.js',
      'src/static/js/react-dom.production.min.js',
      'src/static/js/react.production.min.js',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: globals.node },
    settings: { react: { version: '16.14' } },
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,

  // Backend en CommonJS
  {
    files: ['src/**/*.js'],
    ignores: ['src/static/**'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // Tests Jest
  {
    files: ['spec/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.jest } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // Frontend en React via script tags (CDN)
  {
    files: ['src/static/js/app.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        React: 'readonly',
        ReactDOM: 'readonly',
        ReactBootstrap: 'readonly',
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
