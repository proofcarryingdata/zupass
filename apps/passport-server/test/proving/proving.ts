import { ProveRequest } from "@pcd/passport-interface";
import chai from "chai";
import chaiHttp from "chai-http";
import { Response } from "superagent";
import { PCDPass } from "../../src/types";

chai.use(chaiHttp);

export async function sendProveRequest(
  application: PCDPass,
  proveRequest: ProveRequest,
  handler: (r: Response) => Promise<void>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { expressContext } = application;

    chai
      .request(expressContext.app)
      .post("/pcds/prove")
      .send(proveRequest)
      .then(async (r) => {
        try {
          await handler(r);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
  });
}
