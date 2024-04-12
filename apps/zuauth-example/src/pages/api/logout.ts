import { withSessionRoute } from "@/utils/withSession";
import { NextApiRequest, NextApiResponse } from "next";

export default withSessionRoute(function (
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    req.session.destroy();

    res.status(200).send({
      ok: true
    });
  } catch (error: any) {
    console.error(`[ERROR] ${error}`);

    res.status(500).send(`Unknown error: ${error.message}`);
  }
});
