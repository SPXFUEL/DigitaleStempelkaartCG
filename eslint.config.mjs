import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";
import globals from "globals";

/**
 * Flat-config voor ESLint 9. We extenden bewust *niet* `eslint-config-next`
 * via FlatCompat omdat dat met ESLint 9 een circular-JSON-bug triggert.
 * In plaats daarvan importeren we de plugins die er voor matter (TS + React
 * Hooks + JSX a11y) direct en houden de set bewust klein.
 */
export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "public/sw.js",
      "data/**",
      "coverage/**",
      "*.config.{js,mjs,cjs,ts}",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2025,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": ["warn", { allow: ["warn", "error", "log"] }],
      // De v7 react-hooks plugin verbiedt setState in effects en impure
      // calls in render — strikt voor React Compiler, te aggressief voor
      // ons (we doen client-only platform-detectie in effects, en
      // Date.now() in dynamische server-components is prima).
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
    },
  },
  // Service-worker scope (eigen globals zoals self, caches, clients)
  {
    files: ["public/sw.js"],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  // Pas Prettier ALS LAATSTE toe — disabled style-only regels die met
  // prettier botsen.
  prettier,
];
