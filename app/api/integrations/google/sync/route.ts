import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  GmailIntegrationError,
  syncGmailMessages,
} from "@/lib/integrations/email/google-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  organizationId: z.string().uuid(),
  maxThreads: z.number().int().min(1).max(25).optional(),
  query: z.string().trim().max(300).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A JSON request body is required." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid synchronization request." }, { status: 400 });
  }

  try {
    const result = await syncGmailMessages({
      organizationId: parsed.data.organizationId,
      maxThreads: parsed.data.maxThreads,
      query: parsed.data.query,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof GmailIntegrationError) {
      const status = error.code === "not_connected" ? 403
        : error.code === "reauthorization_required" ? 409 : 502;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "Unable to synchronize Gmail messages." }, { status: 500 });
  }
}
