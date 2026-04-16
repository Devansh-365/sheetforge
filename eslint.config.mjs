import boundaries from 'eslint-plugin-boundaries';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// V0-002-lite — core slice-boundary rules are enforced on real source.
// CI-enforced negative fixtures (a file that imports a banned path and must
// fail ESLint) are deferred to V0-002b. Tracked in `.omc/plans/v0-consensus-v3.md`.

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    files: [
      'apps/**/*.{ts,tsx}',
      'slices/**/*.ts',
      'packages/**/*.ts',
      'shared/**/*.ts',
    ],
    plugins: { boundaries },
    settings: {
      'boundaries/root-path': __dirname,
      'boundaries/elements': [
        { type: 'apps', pattern: 'apps/*', capture: ['app'] },
        { type: 'slices', pattern: 'slices/*', capture: ['slice'] },
        { type: 'packages', pattern: 'packages/*', capture: ['pkg'] },
        { type: 'shared', pattern: 'shared/*', capture: ['shared'] },
      ],
      'boundaries/ignore': ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts'],
    },
    rules: {
      // Layer dependency rules:
      //   apps/*     → slices/*, shared/*, packages/*
      //   slices/*   → shared/*, packages/*, other slices/* (barrel-only, enforced below)
      //   packages/* → other packages/* only (OSS-safe)
      //   shared/*   → leaf (node_modules only)
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'apps', allow: ['slices', 'shared', 'packages'] },
            { from: 'slices', allow: ['shared', 'packages', 'slices'] },
            { from: 'packages', allow: ['packages'] },
            { from: 'shared', allow: [] },
          ],
        },
      ],

      // Cross-slice imports must go through the barrel (index.ts); no internals.
      'boundaries/entry-point': [
        'error',
        {
          default: 'disallow',
          rules: [
            { target: 'slices', allow: 'index.{ts,tsx,js,jsx}' },
            { target: 'shared', allow: '**' },
            { target: 'packages', allow: '**' },
            { target: 'apps', allow: '**' },
          ],
        },
      ],

      // Direct producer/internal access to packages/queue is forbidden.
      // All writes must flow through slices/write-queue/submitWrite().
      // Closes CLAUDE.md principle "no writes bypass the queue" + critic C1.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/packages/queue/src/producer*',
                '**/queue/src/producer*',
                '@sheetforge/queue/src/producer*',
              ],
              message:
                'Direct producer access is forbidden. Writes must go through slices/write-queue/submitWrite(). (CLAUDE.md principle 3)',
            },
            {
              group: [
                '**/packages/queue/src/internal/**',
                '**/queue/src/internal/**',
                '@sheetforge/queue/src/internal/**',
              ],
              message:
                'Importing queue internals is forbidden. Use slices/write-queue/submitWrite().',
            },
          ],
        },
      ],
    },
  },
];

export default config;
