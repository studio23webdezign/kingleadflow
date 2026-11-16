import { NextRequest, NextResponse } from "next/server";
import {
  GmailIntegrationError,
  listGmailThreads,
} from "@/lib/integrations/email/google-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organization_id");
  if (!organizationId) {
    return NextResponse.json({ error: "organization_id is required" }, { status: 400 });
  }

  const requestedMax = Number(request.nextUrl.searchParams.get("max_results") ?? 20);
  const maxResults = Number.isFinite(requestedMax) ? requestedMax : 20;

  try {
    const result = await listGmailThreads({
      organizationId,
      pageToken: request.nextUrl.searchParams.get("page_token") ?? undefined,
      query: request.nextUrl.searchParams.get("q") ?? undefined,
      maxResults,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof GmailIntegrationError) {
      const status = error.code === "not_connected" ? 403
        : error.code === "reauthorization_required" ? 409
        : error.code === "invalid_response" ? 502 : 502;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "Unable to load Gmail threads." }, { status: 500 });
  }
}
