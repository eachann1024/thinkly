import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactPlugin from 'eslint-plugin-react'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import uiControls from './config/ui-control-eslint.mjs'

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-electron',
    'dist-desktop',
    'dist-signpath',
    'output',
    'tmp',
    'tests',
    'plans',
    'node_modules',
    'scripts',
    'video',
    '.claude',
    '.delta',
    '.treehouse',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      react: reactPlugin,
      'jsx-a11y': jsxA11y,
      'goose-ui': uiControls,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'goose-ui/public-controls': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'react-refresh/only-export-components': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/refs': 'warn',
      'prefer-const': 'warn',
      'no-case-declarations': 'warn',
      'no-useless-escape': 'warn',
      'no-empty': 'warn',
      'react/no-danger': 'warn',
      'jsx-a11y/aria-role': 'warn',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/purity': 'warn',
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
