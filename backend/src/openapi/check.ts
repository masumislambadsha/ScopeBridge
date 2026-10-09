import { Router } from "express";
import modulesRouter from "../modules/index";
import authRouter from "../modules/auth/auth.routes";
import { registerRoutes } from "./routes";
import { getRegistry } from "./document";

registerRoutes();

function collect(router: Router, base = ""): Set<string> {
  const found = new Set<string>();
  const stack = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> }; handle?: { stack?: unknown[] }; name?: string }> }).stack;
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).filter((m) => m !== "_all");
      for (const m of methods) found.add(`${m.toUpperCase()} ${base}${layer.route.path}`);
    }
  }
  return found;
}

// Each module router is mounted at the root of modules/index, itself mounted at /api.
// The auth router mounts separately at /api/auth (see app.ts).
const expressed = new Set<string>();
for (const entry of collect(authRouter, "/api/auth")) expressed.add(entry);
const top = (modulesRouter as unknown as { stack: Array<{ handle?: Router }> }).stack;
for (const layer of top) {
  if (layer.handle && typeof layer.handle === "function" && (layer.handle as unknown as { stack?: unknown[] }).stack) {
    for (const entry of collect(layer.handle as Router, "/api")) expressed.add(entry);
  }
}

const documented = new Set(getRegistry().map((r) => `${r.method.toUpperCase()} ${r.path}`));
const missing = [...expressed].filter((e) => !documented.has(e));
const extra = [...documented].filter((d) => !expressed.has(d));

if (missing.length || extra.length) {
  if (missing.length) console.error(`[openapi:check] routes missing from registry:\n  ${missing.join("\n  ")}`);
  if (extra.length) console.error(`[openapi:check] registry entries with no route:\n  ${extra.join("\n  ")}`);
  process.exit(1);
}
console.log(`[openapi:check] OK — ${expressed.size} routes documented`);
process.exit(0);
