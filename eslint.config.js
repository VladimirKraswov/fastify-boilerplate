import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: {
      import: importPlugin,
      'simple-import-sort': simpleImportSort
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { project: './tsconfig.json' }
    },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' }
      }
    },
    rules: {
      // NodeNext/ESM — пусть TypeScript валидирует резолв
      'import/no-unresolved': 'off',
      'import/named': 'off',

      // отключаем стандартную сортировку, чтобы не конфликтовала
      'import/order': 'off',

      // ✅ СТРОГАЯ ГРУППИРОВКА И РАЗДЕЛЕНИЕ
      'simple-import-sort/imports': [
        'warn',
        {
          groups: [
            // 1️⃣ node builtins (node:fs)
            ['^node:'],

            // 2️⃣ builtin без node:
            [
              '^(assert|buffer|child_process|crypto|events|fs|http|https|net|os|path|stream|timers|tls|tty|url|util|zlib)(/.*)?$'
            ],

            // 3️⃣ external runtime
            ['^@?\\w'],

            // 4️⃣ external types
            ['^@?\\w.*\\u0000$'],

            // 5️⃣ internal runtime (твои алиасы)
            [
              '^@config(/.*)?$',
              '^@plugins(/.*)?$',
              '^@modules(/.*)?$',
              '^@domain(/.*)?$',
              '^@shared(/.*)?$',
              '^@(/.*)?$'
            ],

            // 6️⃣ internal types
            [
              '^@config(/.*)?\\u0000$',
              '^@plugins(/.*)?\\u0000$',
              '^@modules(/.*)?\\u0000$',
              '^@domain(/.*)?\\u0000$',
              '^@shared(/.*)?\\u0000$',
              '^@(/.*)?\\u0000$'
            ],

            // 7️⃣ parent
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],

            // 8️⃣ sibling + index
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],

            // 9️⃣ side effects
            ['^\\u0000']
          ]
        }
      ],

      'simple-import-sort/exports': 'warn',

      // качество кода
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off'
    }
  }
];
