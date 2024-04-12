import { withSessionRoute } from "@/utils/withSession";
import { getRandomValues, hexToBigInt, toHexString } from "@pcd/util";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * The watermark is a unique single-use number, which is provided to the
 * front-end before requesting a ZK proof for authentication. The watermark is
 * included in the proof, which means that we can ensure that the proof was
 * created for our use, and is not being re-used.
 */
export default withSessionRoute(async function (
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    req.session.watermark = hexToBigInt(
      toHexString(getRandomValues(30))
    ).toString();

    await req.session.save();

    res.status(200).send({
      watermark: req.session.watermark
    });
  } catch (error: any) {
    console.error(`[ERROR] ${error}`);

    res.status(500).send(`Unknown error: ${error.message}`);
  }
});
