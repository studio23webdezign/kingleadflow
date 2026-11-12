import { describe, expect, it } from "vitest";
import { scoreLead } from "./scoring";
import type { ExtractedInquiry } from "./types";

function inquiry(overrides: Partial<ExtractedInquiry> = {}): ExtractedInquiry {
  return {
    contact_name: "Alex Morgan",
    email: "alex@example.com",
    phone: "+27123456789",
    service_requested: "roof repair",
    postal_code: "4051",
    urgency: "high",
    purchase_readiness: "ready",
    intent: "quote_request",
    summary: "Needs a roof repair quote in Durban North.",
    suggested_reply: "Thanks for your enquiry. Our team will be in touch.",
    confidence: 0.95,
    ...overrides,
  };
}

describe("scoreLead", () => {
  it("awards 100 for a complete, urgent, ready inquiry matching service and area", () => {
    const result = scoreLead(inquiry(), {
      services: ["Roof repair", "Roof replacement"],
      serviceAreas: ["Durban North"],
    });

    expect(result.score).toBe(100);
    expect(result.priority).toBe("high");
    expect(result.reasons).toHaveLength(5);
  });

  it("uses a neutral area score when no service areas are configured", () => {
    const result = scoreLead(inquiry(), { services: [], serviceAreas: [] });

    expect(result.score).toBe(88);
    expect(result.priority).toBe("high");
    expect(result.reasons[2]).toContain("no service areas are configured");
  });

  it("does not award full service-fit points for a service outside the configured catalogue", () => {
    const result = scoreLead(inquiry({ service_requested: "pool cleaning" }), {
      services: ["Roof repair"],
      serviceAreas: ["Durban North"],
    });

    expect(result.score).toBe(88);
    expect(result.reasons[0]).toContain("does not match the configured catalogue");
  });

  it("classifies an exact score of 50 as medium", () => {
    const result = scoreLead(inquiry({
      contact_name: "Alex Morgan",
      email: "alex@example.com",
      phone: "",
      service_requested: "",
      summary: "Looking for help with a project.",
      urgency: "medium",
      purchase_readiness: "researching",
      postal_code: "",
    }), { services: [], serviceAreas: [] });

    expect(result.score).toBe(50);
    expect(result.priority).toBe("medium");
  });

  it("classifies low-scoring incomplete inquiries as low", () => {
    const result = scoreLead(inquiry({
      contact_name: "",
      email: "",
      phone: "",
      service_requested: "",
      summary: "",
      urgency: "low",
      purchase_readiness: "researching",
    }), { services: [], serviceAreas: [] });

    expect(result.score).toBe(18);
    expect(result.priority).toBe("low");
  });
});
