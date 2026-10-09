// frontend/eslint.config.mjs — flat config, browser + TypeScript (+ Next.js via eslint-config-next)
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "out/**", "test-results/**", "playwright-report/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  }
);
