import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Utility scripts (not part of the app)
    "scripts/**",
    "*.cjs",
    "*.mjs",
    "check_state.mjs",
    "apply_035_data.js",
    "read_excel.js",
    "verify-build.js",
  ]),
]);

export default eslintConfig;
