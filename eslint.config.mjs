import boundaries from 'eslint-plugin-boundaries';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'apps', pattern: 'apps/*', capture: ['app'] },
        { type: 'slices', pattern: 'slices/*', capture: ['slice'] },
        { type: 'packages', pattern: 'packages/*', capture: ['pkg'] },
        { type: 'shared', pattern: 'shared/*', capture: ['shared'] },
      ],
      'boundaries/ignore': ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts'],
    },
    rules: {
      // apps/* can import slices/*, shared/*, packages/*
      // slices/* can import shared/*, packages/*; only barrel of other slices
      // packages/* can only import other packages/*
      // shared/* is a leaf: only node_modules
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: 'apps',
              allow: ['slices', 'shared', 'packages'],
            },
            {
              from: 'slices',
              allow: ['shared', 'packages'],
              // Cross-slice imports must go through barrel (index.ts) only.
              // Enforced by not listing 'slices' here — direct internal imports are blocked.
            },
            {
              from: 'packages',
              allow: ['packages'],
            },
            {
              from: 'shared',
              allow: [],
            },
          ],
        },
      ],
    },
  },
];

export default config;
