import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [
    angular({
      tsconfig: 'tsconfig.spec.json',
      jit: true,
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text'],
      reportsDirectory: './coverage',
      include: ['src/app/**/*.ts'],
      exclude: [
        '**/*.spec.ts',
        '**/*.routes.ts',
        '**/*.module.ts',
        '**/*.css',
        '**/*.html',
      ],
    },
  },
});
