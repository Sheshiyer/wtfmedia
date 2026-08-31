import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "storybook-static/**",
      "lighthouse-reports/**",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
];

export default config;
