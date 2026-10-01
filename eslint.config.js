import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'agents/', 'docs/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'JSON', property: 'parse', message: 'Use src/json/exact-json.ts (spec D5).' },
        { object: 'JSON', property: 'stringify', message: 'Use src/http/encode.ts (spec D5).' },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'parseFloat', message: 'No floats for money (MON-01).' },
      ],
    },
  },
);
