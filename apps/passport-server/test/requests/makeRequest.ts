import chai from "chai";
import { Response } from "superagent";
import { PCDPass } from "../../src/types";

export function makeGetRequest(
  application: PCDPass,
  path: string
): Promise<Response> {
  const { expressContext } = application;
  return chai.request(expressContext.app).get(path).send();
}
