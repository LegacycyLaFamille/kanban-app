import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("/api/v1"),
  },

  test: {
    environment: "jsdom",

    setupFiles: ["./src/test/setupTests.ts"],

    include: ["src/**/*.test.{ts,tsx}"],

    coverage: {
      provider: "v8",

      reporter: ["text", "html", "lcov"],

      reportsDirectory: "./coverage",

      include: ["src/**/*.{ts,tsx}"],

      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/app/legacy/**",
        "src/main.tsx",
      ],
    },
  },
});
