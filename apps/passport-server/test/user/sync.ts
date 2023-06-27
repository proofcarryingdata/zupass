import { LoadE2EERequest, ZuParticipant } from "@pcd/passport-interface";
import { default as chai, expect } from "chai";
import "chai-spies";
import "mocha";
import httpMocks from "node-mocks-http";
import { PCDPass } from "../../src/types";

export async function sync(
  application: PCDPass,
  user: ZuParticipant
): Promise<void> {
  const { e2eeService } = application.globalServices;

  const request: LoadE2EERequest = {
    blobKey: "asdf",
  };

  const response = httpMocks.createResponse();
  const nextFunc = chai.spy((_returns: any) => null);
  await e2eeService.handleLoad(request, response, nextFunc);
  expect(nextFunc).to.not.have.been.called();
  expect(response.statusCode).to.eq(404);
}
