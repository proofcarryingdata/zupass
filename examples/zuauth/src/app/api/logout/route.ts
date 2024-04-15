import { SessionData, ironOptions } from "@/config/iron";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const session = await getIronSession<SessionData>(
      cookies() as any,
      ironOptions
    );
    session.destroy();

    return Response.json({
      ok: true
    });
  } catch (error: any) {
    console.error(`[ERROR] ${error}`);
    return new Response(`Unknown error: ${error.message}`, { status: 500 });
  }
}
