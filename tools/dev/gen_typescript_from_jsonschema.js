import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// Requires: npx json-schema-to-typescript
// Usage: node tools/dev/gen_typescript_from_jsonschema.js

const root = resolve(process.cwd());
const schemaDir = join(root, "schemas", "jsonschema", "v1");
const outDir = join(root, "schemas", "typescript", "v1");

mkdirSync(outDir, { recursive: true });

const files = readdirSync(schemaDir)
  .filter((f) => f.endsWith(".json"))
  .filter((f) => !f.startsWith("_"))
  .filter((f) => f !== "index.json");

for (const file of files) {
  const inPath = join(schemaDir, file);
  const base = file.replace(/\.json$/, "");
  const outPath = join(outDir, `${base}.ts`);

  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["-y", "json-schema-to-typescript", inPath, outPath],
    { stdio: "inherit" },
  );
}

