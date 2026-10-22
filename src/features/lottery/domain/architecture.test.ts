import { describe, expect, it } from "vitest";
import { readdir, readFile } from "node:fs/promises";
describe("límites de dependencias", () => {
  it("mantiene el núcleo independiente de frameworks y adaptadores", async () => {
    for (const layer of ["domain", "application"]) {
      const base = `src/features/lottery/${layer}`;
      for (const file of await readdir(base)) {
        if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
        const source = await readFile(`${base}/${file}`, "utf8");
        const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
          (m) => m[1],
        );
        expect(
          imports.every(
            (path) =>
              path.startsWith("./") ||
              (layer === "application" && path.startsWith("../domain/")),
          ),
          file,
        ).toBe(true);
        expect(source, file).not.toMatch(
          /\b(document|window|HTMLCanvasElement|File|Blob|Worker|localStorage|indexedDB)\b/,
        );
      }
    }
  });
});
