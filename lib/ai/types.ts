import { z } from "zod";

export const extractedInquirySchema = z.object({
  contact_name: z.string().max(160),
  email: z.string().max(254),
  phone: z.string().max(40),
  service_requested: z.string().max(160),
  postal_code: z.string().max(24),
  urgency: z.enum(["high", "medium", "low", "unknown"]),
  purchase_readiness: z.enum(["ready", "considering", "researching", "unknown"]),
  intent: z.enum(["service_request", "quote_request", "question", "other"]),
  summary: z.string().max(1200),
  suggested_reply: z.string().max(1200),
  confidence: z.number().min(0).max(1),
}).strict();

export type ExtractedInquiry = z.infer<typeof extractedInquirySchema>;
