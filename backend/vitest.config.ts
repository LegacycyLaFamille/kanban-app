import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      // Measure coverage across the whole TypeScript codebase, not only the
      // files touched by existing tests, so the threshold reflects reality.
      all: true,
      include: ["src/**/*.ts"],
      // src/legacy is CommonJS pre-migration code kept as-is; it is excluded
      // from the TypeScript test suite entirely (see docs/quality-gate.md).
      // src/generated is Prisma's generated client, not source we write
      // or test; it isn't committed either (see .gitignore).
      exclude: [
        "src/legacy/**",
        "src/tests/**",
        "src/generated/**",
        "**/*.d.ts",
      ],
      reporter: ["text", "lcov"],
      // Honest baseline for a backend that is early in its TypeScript rewrite
      // (~23% coverage today, see docs/quality-gate.md). Raise these numbers
      // as tests are added; do not lower them to make CI pass.
      thresholds: {
        statements: 20,
        branches: 20,
        functions: 20,
        lines: 20,
      },
    },
  },
});
