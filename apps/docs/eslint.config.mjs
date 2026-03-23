import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import onlyWarn from "eslint-plugin-only-warn";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { plugins: { onlyWarn } },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
