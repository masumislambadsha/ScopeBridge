import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { buildDocument } from "./document";

registerRoutes();
const doc = buildDocument();
const out = path.join(__dirname, "..", "..", "..", "docs", "openapi.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(doc, null, 2));
const count = Object.values(doc.paths as Record<string, object>).reduce((n, p) => n + Object.keys(p).length, 0);
console.log(`[openapi] wrote ${out} (${Object.keys(doc.paths as object).length} paths, ${count} operations)`);
