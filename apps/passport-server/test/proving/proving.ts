import { ProveRequest } from "@pcd/passport-interface";
import chai from "chai";
import chaiHttp from "chai-http";
import { PCDPass } from "../../src/types";

chai.use(chaiHttp);

export async function sendProveRequest(application: PCDPass): Promise<void> {
  const { expressContext: expressServer } = application;

  const proveRequest: ProveRequest = { args: {}, pcdType: "" };

  (await chai.request(expressServer).post("/pcds/prove").send(proveRequest)).on(
    "end",
    (err, res) => {
      console.log(err, res);
    }
  );
}
