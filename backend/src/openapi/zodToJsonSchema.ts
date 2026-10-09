import { z } from "zod";

/** Minimal Zod → JSON Schema converter covering the subset used in our schemas (D-08). */
export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const def = (schema as unknown as { _def: Record<string, unknown> })._def;
  const typeName: string = (def.typeName ?? "") as string;

  const withDesc = (out: Record<string, unknown>): Record<string, unknown> => {
    if (typeof def.description === "string") out.description = def.description;
    return out;
  };

  switch (typeName) {
    case "ZodString": {
      const checks = (def.checks ?? []) as Array<{ kind: string; value?: unknown }>;
      const out: Record<string, unknown> = { type: "string" };
      for (const c of checks) {
        if (c.kind === "min") out.minLength = c.value;
        if (c.kind === "max") out.maxLength = c.value;
        if (c.kind === "email") out.format = "email";
        if (c.kind === "url") out.format = "uri";
        if (c.kind === "datetime") out.format = "date-time";
      }
      return withDesc(out);
    }
    case "ZodNumber":
      return withDesc({ type: "number" });
    case "ZodBoolean":
      return withDesc({ type: "boolean" });
    case "ZodEnum":
      return withDesc({ type: "string", enum: (def.values ?? []) as unknown[] });
    case "ZodNativeEnum":
      return withDesc({ type: "string", enum: Object.values((def.values ?? {}) as object).filter((v) => typeof v === "string") });
    case "ZodLiteral":
      return withDesc({ enum: [def.value] });
    case "ZodArray":
      return withDesc({ type: "array", items: zodToJsonSchema(def.type as z.ZodTypeAny) });
    case "ZodObject": {
      const shape = (def.shape ?? {}) as Record<string, z.ZodTypeAny>;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [k, v] of Object.entries(shape)) {
        properties[k] = zodToJsonSchema(v);
        const inner = (v as unknown as { _def: { typeName: string } })._def.typeName;
        if (inner !== "ZodOptional" && inner !== "ZodDefault") required.push(k);
      }
      const out: Record<string, unknown> = { type: "object", properties };
      if (required.length) out.required = required;
      return withDesc(out);
    }
    case "ZodRecord":
      return withDesc({ type: "object" });
    case "ZodOptional":
    case "ZodDefault":
      return zodToJsonSchema(def.innerType as z.ZodTypeAny);
    case "ZodNullable": {
      const inner = zodToJsonSchema(def.innerType as z.ZodTypeAny);
      return withDesc({ ...inner, nullable: true });
    }
    case "ZodUnion":
    case "ZodDiscriminatedUnion":
      return withDesc({ anyOf: ((def.options ?? []) as z.ZodTypeAny[]).map(zodToJsonSchema) });
    case "ZodEffects":
      return zodToJsonSchema(def.schema as z.ZodTypeAny);
    case "ZodCoercedString":
      return withDesc({ type: "string" });
    case "ZodCoercedNumber":
      return withDesc({ type: "number" });
    case "ZodAny":
    case "ZodUnknown":
    default:
      return withDesc({});
  }
}
