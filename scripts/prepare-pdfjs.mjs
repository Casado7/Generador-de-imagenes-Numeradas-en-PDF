import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = dirname(require.resolve("pdfjs-dist/package.json"));
const { version } = JSON.parse(
  await readFile(join(root, "package.json"), "utf8"),
);
const target = join(process.cwd(), "public", "pdfjs", version);
await mkdir(target, { recursive: true });
for (const folder of ["cmaps", "standard_fonts", "wasm", "iccs"])
  await cp(join(root, folder), join(target, folder), { recursive: true });
await cp(
  join(root, "build/pdf.worker.min.mjs"),
  join(target, "pdf.worker.min.mjs"),
);
await cp(join(root, "LICENSE"), join(target, "LICENSE"));
await writeFile(join(target, "version.txt"), version + "\n");
console.log(`Recursos PDF locales preparados (${version}).`);
