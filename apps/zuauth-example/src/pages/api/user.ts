import { withSessionRoute } from "@/utils/withSession";
import { NextApiRequest, NextApiResponse } from "next";

export default withSessionRoute(function (
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.status(200).send({
    user: req.session.user || false
  });
});
