import { SessionData, ironOptions } from "@/config/iron";
import { eventTicketMetadata } from "@/metadata";
import { authenticate } from "@pcd/zuauth/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Once the front-end has received a PCD from the popup window, it sends it to
 * the back-end for verification.
 *
 * Calling {@link authenticate} will check that the PCD is cryptographically
 * valid, has the correct watermark, and that its contents match the expected
 * event metadata (public key, event ID, product ID).
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.pcd) {
    console.error(`[ERROR] No PCD specified`);
    return new Response("No PCD specified", { status: 400 });
  }

  try {
    const session = await getIronSession<SessionData>(
      cookies() as any,
      ironOptions
    );
    const pcd = await authenticate(
      body.pcd,
      session.watermark ?? "",
      eventTicketMetadata
    );

    session.user = pcd.claim.partialTicket;
    await session.save();
    return Response.json({
      user: session.user,
      nullifier: pcd.claim.nullifierHash
    });
  } catch (e) {
    console.error(`[ERROR] ${e}`);
    return new Response(
      e instanceof Error ? e.message : "An unexpected error occurred",
      { status: 400 }
    );
  }
}
