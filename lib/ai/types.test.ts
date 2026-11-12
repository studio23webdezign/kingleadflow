import { describe, expect, it } from "vitest";
import { extractedInquirySchema } from "./types";

const validInquiry = {
  contact_name: "Alex Morgan",
  email: "alex@example.com",
  phone: "+27123456789",
  service_requested: "roof repair",
  postal_code: "4051",
  urgency: "high",
  purchase_readiness: "ready",
  intent: "quote_request",
  summary: "Customer needs a roof repair quote.",
  suggested_reply: "Thanks for your enquiry. Our team will review it.",
  confidence: 0.92,
};

describe("extractedInquirySchema", () => {
  it("accepts a complete, well-formed inquiry", () => {
    expect(extractedInquirySchema.safeParse(validInquiry).success).toBe(true);
  });

  it("rejects unsupported urgency and intent classifications", () => {
    expect(extractedInquirySchema.safeParse({
      ...validInquiry,
      urgency: "emergency",
    }).success).toBe(false);
    expect(extractedInquirySchema.safeParse({
      ...validInquiry,
      intent: "book_appointment",
    }).success).toBe(false);
  });

  it("rejects confidence values outside the 0–1 range", () => {
    expect(extractedInquirySchema.safeParse({
      ...validInquiry,
      confidence: 1.01,
    }).success).toBe(false);
    expect(extractedInquirySchema.safeParse({
      ...validInquiry,
      confidence: -0.01,
    }).success).toBe(false);
  });

  it("rejects oversized fields and unexpected properties", () => {
    expect(extractedInquirySchema.safeParse({
      ...validInquiry,
      summary: "x".repeat(1201),
    }).success).toBe(false);
    expect(extractedInquirySchema.safeParse({
      ...validInquiry,
      tenant_id: "untrusted-client-value",
    }).success).toBe(false);
  });
});
