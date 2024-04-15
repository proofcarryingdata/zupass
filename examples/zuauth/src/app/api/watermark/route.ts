import { SessionData, ironOptions } from "@/config/iron";
import { getRandomValues, hexToBigInt, toHexString } from "@pcd/util";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

/**
 * The watermark is a unique single-use number, which is provided to the
 * front-end before requesting a ZK proof for authentication. The watermark is
 * included in the proof, which means that we can ensure that the proof was
 * created for our use, and is not being re-used.
 */
export async function GET() {
  try {
    const session = await getIronSession<SessionData>(
      cookies() as any,
      ironOptions
    );
    session.watermark = hexToBigInt(
      toHexString(getRandomValues(30))
    ).toString();

    await session.save();

    return Response.json({ watermark: session.watermark });
  } catch (error: any) {
    console.error(`[ERROR] ${error}`);
    return new Response(`Unknown error: ${error.message}`, { status: 500 });
  }
}
