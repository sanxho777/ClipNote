import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['dist/**', 'release/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin
    },
    rules: {
      'no-unused-vars': 'warn',
      'import/order': ['error', {
        'groups': [['builtin','external'],'internal',['parent','sibling','index']],
        'newlines-between': 'always'
      }]
    }
  }
];
