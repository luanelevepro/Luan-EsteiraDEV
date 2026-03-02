import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { defineConfig } from 'eslint/config';
import tsEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser'; // Import the parser
import eslintPluginUnicorn from 'eslint-plugin-unicorn';

export default defineConfig([
  {
    files: ['**/*.ts'],
    plugins: {
      prettier: eslintPluginPrettier,
      '@typescript-eslint': tsEslint,
      unicorn: eslintPluginUnicorn,
    },
    languageOptions: {
      parser: tsParser, // Use the imported parser
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
      '@typescript-eslint/camelcase': 'off',
      '@typescript-eslint/class-methods-use-this': 'off',
      '@typescript-eslint/no-param-reassign': 'off',
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      '@typescript-eslint/no-unused-vars': "off"
    },
  },
  eslintConfigPrettier,
]);
