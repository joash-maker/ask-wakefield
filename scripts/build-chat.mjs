import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ["lib/chat/runtime-entry.ts"],
  outfile: "lib/chat/runtime.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  packages: "external",
  sourcemap: false,
  legalComments: "none",
  logLevel: "warning",
});
console.log("Built self-contained JavaScript chat runtime.");
