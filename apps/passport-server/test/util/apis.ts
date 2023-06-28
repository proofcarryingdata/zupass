import chai from "chai";
import { IEmailAPI } from "../../src/apis/emailAPI";
import { IPretixAPI } from "../../src/apis/pretixAPI";
import { APIs } from "../../src/types";
import { getMockZuzaluPretixAPI } from "../pretix/mockPretixApi";

export function mockAPIs(): APIs {
  const emailAPI: IEmailAPI | null = {
    send: chai.spy.returns(Promise.resolve()),
  };

  const pretixAPI: IPretixAPI | null = getMockZuzaluPretixAPI();

  return {
    emailAPI,
    pretixAPI,
  };
}
