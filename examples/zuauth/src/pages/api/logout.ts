import { SessionData, ironOptions } from "@/config/iron";
import { getIronSession } from "iron-session";
import { NextApiRequest, NextApiResponse } from "next";

export default async function Logout(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getIronSession<SessionData>(req, res, ironOptions);
    session.destroy();

    res.status(200).send({
      ok: true
    });
  } catch (error: any) {
    console.error(`[ERROR] ${error}`);
    res.status(500).send(`Unknown error: ${error.message}`);
  }
}
