import { describe, it, expect } from "vitest";
import { api, expectEnvelope } from "./helpers";

describe("operations", () => {
  it("GET /health returns the spec envelope", async () => {
    const res = await api.get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: expect.objectContaining({ status: "ok" }) });
  });

  it("GET /ready reports readiness when infra is up", async () => {
    const res = await api.get("/ready");
    expect(res.status).toBe(200);
    expectEnvelope(res);
    expect(res.body.data.status).toBe("ready");
  });

  it("GET /api-docs.json serves the OpenAPI document", async () => {
    const res = await api.get("/api-docs.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
  });

  it("unknown routes return NOT_FOUND envelope", async () => {
    const res = await api.get("/api/nope-not-here");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: expect.objectContaining({ code: "NOT_FOUND" }),
    });
  });
});
