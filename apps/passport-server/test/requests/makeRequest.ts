import chai from "chai";
import { Response } from "superagent";
import { PCDpass } from "../../src/types";

export function makeGetRequest(
  application: PCDpass,
  path: string
): Promise<Response> {
  const { expressContext } = application;
  return chai.request(expressContext.app).get(path).send();
}
