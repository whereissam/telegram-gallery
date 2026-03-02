import { describe, it, expect } from "bun:test";
import { z } from "zod/v4";

// Replicate the schemas from index.ts to test validation logic
const sendCodeSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
});

const signInSchema = z.object({
  phone: z.string().min(1),
  code: z.string().min(1, "Verification code is required"),
  phone_code_hash: z.string().min(1),
});

const messagesQuerySchema = z.object({
  offset_id: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

const mediaParamsSchema = z.object({
  messageId: z.coerce.number().int().positive(),
});

describe("validation schemas", () => {
  it("sendCodeSchema rejects empty phone", () => {
    const result = sendCodeSchema.safeParse({ phone: "" });
    expect(result.success).toBe(false);
  });

  it("sendCodeSchema accepts valid phone", () => {
    const result = sendCodeSchema.safeParse({ phone: "+1234567890" });
    expect(result.success).toBe(true);
  });

  it("signInSchema rejects missing fields", () => {
    expect(signInSchema.safeParse({}).success).toBe(false);
    expect(signInSchema.safeParse({ phone: "x" }).success).toBe(false);
    expect(signInSchema.safeParse({ phone: "x", code: "1" }).success).toBe(false);
  });

  it("signInSchema accepts valid input", () => {
    const result = signInSchema.safeParse({
      phone: "+1234567890",
      code: "12345",
      phone_code_hash: "abc",
    });
    expect(result.success).toBe(true);
  });

  it("messagesQuerySchema applies defaults", () => {
    const result = messagesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.offset_id).toBe(0);
      expect(result.data.limit).toBe(30);
    }
  });

  it("messagesQuerySchema coerces string values", () => {
    const result = messagesQuerySchema.safeParse({ offset_id: "10", limit: "20" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.offset_id).toBe(10);
      expect(result.data.limit).toBe(20);
    }
  });

  it("messagesQuerySchema rejects limit > 50", () => {
    const result = messagesQuerySchema.safeParse({ limit: "100" });
    expect(result.success).toBe(false);
  });

  it("mediaParamsSchema rejects non-positive", () => {
    expect(mediaParamsSchema.safeParse({ messageId: "0" }).success).toBe(false);
    expect(mediaParamsSchema.safeParse({ messageId: "-1" }).success).toBe(false);
  });

  it("mediaParamsSchema accepts valid id", () => {
    const result = mediaParamsSchema.safeParse({ messageId: "42" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.messageId).toBe(42);
    }
  });
});
