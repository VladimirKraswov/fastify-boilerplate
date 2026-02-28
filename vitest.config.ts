import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${src}/` },
      { find: /^@test\//, replacement: `${src}/test/` },
      { find: /^@modules\//, replacement: `${src}/modules/` },
      { find: /^@shared\//, replacement: `${src}/shared/` },
      { find: /^@plugins\//, replacement: `${src}/plugins/` },
      { find: /^@config\//, replacement: `${src}/config/` },
      { find: /^@domain\//, replacement: `${src}/domain/` }
    ]
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30_000
  }
});
