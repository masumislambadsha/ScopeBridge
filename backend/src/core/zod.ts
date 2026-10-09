import { z } from "zod";

/** Optional datetime that also accepts "" (untouched HTML date inputs) as undefined. */
export const datetimeOptional = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.string().datetime().optional(),
);

/** Nullable-optional datetime: "" means null (explicitly cleared). */
export const datetimeNullableOptional = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().datetime().nullable().optional(),
);
