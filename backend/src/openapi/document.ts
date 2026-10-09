import { z } from "zod";
import { zodToJsonSchema } from "./zodToJsonSchema";

export interface RouteDoc {
  method: "get" | "post" | "patch" | "put" | "delete";
  path: string;
  tags: string[];
  summary: string;
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  auth?: boolean;
}

const routes: RouteDoc[] = [];

export function doc(route: RouteDoc): void {
  routes.push(route);
}

export function getRegistry(): RouteDoc[] {
  return routes;
}

const BER = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    },
  },
});

export function buildDocument() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of routes) {
    const item = (paths[r.path] ??= {});
    const op: Record<string, unknown> = {
      tags: r.tags,
      summary: r.summary,
      ...(r.auth === false ? {} : { security: [{ bearerAuth: [] }] }),
      responses: {
        200: { description: "OK" },
        201: { description: "Created" },
        202: { description: "Accepted (queued AI job)" },
        400: BER("Validation error"),
        401: BER("Unauthenticated"),
        403: BER("Forbidden"),
        404: BER("Not found"),
        409: BER("Conflict"),
        429: BER("Rate limited"),
        500: BER("Internal error"),
      },
    };
    const params: Array<Record<string, unknown>> = [];
    if (r.query) {
      const qs = zodToJsonSchema(r.query);
      const props = (qs.properties ?? {}) as Record<string, unknown>;
      for (const [name, schema] of Object.entries(props)) {
        params.push({ name, in: "query", required: ((qs.required ?? []) as string[]).includes(name), schema });
      }
    }
    if (r.params) {
      const ps = zodToJsonSchema(r.params);
      const props = (ps.properties ?? {}) as Record<string, unknown>;
      for (const [name, schema] of Object.entries(props)) {
        params.push({ name, in: "path", required: true, schema });
      }
    }
    if (params.length) op.parameters = params;
    if (r.body) {
      op.requestBody = {
        required: true,
        content: {
          "application/json": { schema: zodToJsonSchema(r.body) },
          ...(r.path.includes("/files") || r.path.includes("/submissions") || r.path.includes("/change-requests")
            ? { "multipart/form-data": { schema: { type: "object" } } }
            : {}),
        },
      };
    }
    item[r.method] = op;
  }
  return {
    openapi: "3.0.0",
    info: { title: "ScopeBridge API", version: "1.0.0", description: "Client-to-development workflow & scope management" },
    servers: [{ url: "/api" }],
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
    paths,
  };
}
