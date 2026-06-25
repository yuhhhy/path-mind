import { defineConfig } from 'vite-plus';

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    ignorePatterns: ['**/dist/**', '**/src/routeTree.gen.ts'],
    sortImports: {
      newlinesBetween: false,
    },
    singleQuote: true,
    printWidth: 100,
    semi: true,
    tabWidth: 2,
  },
  lint: {
    ignorePatterns: ['**/dist/**', '**/src/routeTree.gen.ts'],
    options: { typeAware: true, typeCheck: true },
    plugins: ['react', 'typescript'],
    jsPlugins: [
      { name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' },
      {
        name: '@tanstack/query',
        specifier: '@tanstack/eslint-plugin-query',
      },
    ],
    rules: {
      '@tanstack/query/exhaustive-deps': 'error',
      '@tanstack/query/no-unstable-deps': 'error',
      '@tanstack/query/prefer-query-options': 'error',
      '@tanstack/query/stable-query-client': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'warn',
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
  },
  run: {
    cache: true,
  },
});
