
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "./app.js";

describe("FinTrust API security", () => {
  it("returns a successful health response", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("FinTrust API is running");
  });

  it("blocks unauthenticated access to customer applications", async () => {
    const response = await request(app).get(
      "/api/loans/applications/my"
    );

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("blocks unauthenticated access to the review queue", async () => {
    const response = await request(app).get(
      "/api/loans/review/applications"
    );

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("blocks unauthenticated loan decisions", async () => {
    const response = await request(app)
      .post("/api/loans/review/applications/not-a-valid-id/decision")
      .send({
        status: "APPROVED",
        notes: "Application documents verified.",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
