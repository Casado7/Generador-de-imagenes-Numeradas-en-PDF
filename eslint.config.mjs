import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  { rules: { "react-hooks/set-state-in-effect": "off" } },
  {
    files: [
      "src/features/lottery/domain/**/*.ts",
      "src/features/lottery/application/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "react",
            "react/*",
            "next",
            "next/*",
            "zod",
            "pdf-lib",
            "fflate",
            "**/infrastructure/*",
            "**/presentation/*",
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        "window",
        "document",
        "localStorage",
        "indexedDB",
      ],
    },
  },
  globalIgnores([
    "out/**",
    ".next/**",
    "test-results/**",
    "playwright-report/**",
    "next-env.d.ts",
    "public/pdfjs/**",
    ".verification/**",
  ]),
]);
