import chai from "chai";
import { IDevconnectPretixAPI } from "../../src/apis/devconnect/devconnectPretixAPI";
import { IEmailAPI } from "../../src/apis/emailAPI";
import { IPretixAPI } from "../../src/apis/pretixAPI";
import { APIs } from "../../src/types";
import { newMockDevconnectPretixAPI } from "../pretix/mockDevconnectPretixApi";
import { newMockZuzaluPretixAPI } from "../pretix/mockPretixApi";

export function mockAPIs(apiOverrides?: Partial<APIs>): APIs {
  let emailAPI: IEmailAPI | null;
  let pretixAPI: IPretixAPI | null;
  let devconnectPretixAPI: IDevconnectPretixAPI | null;

  if (apiOverrides?.emailAPI) {
    emailAPI = apiOverrides.emailAPI;
  } else {
    emailAPI = {
      send: (): Promise<void> => {
        return Promise.resolve();
      },
    };
  }

  if (emailAPI) {
    chai.spy.on(emailAPI, "send");
  }

  if (apiOverrides?.pretixAPI) {
    pretixAPI = apiOverrides.pretixAPI;
  } else {
    pretixAPI = newMockZuzaluPretixAPI();
  }

  if (apiOverrides?.devconnectPretixAPI) {
    devconnectPretixAPI = apiOverrides.devconnectPretixAPI;
  } else {
    devconnectPretixAPI = newMockDevconnectPretixAPI();
  }

  return {
    emailAPI,
    pretixAPI,
    devconnectPretixAPI,
  };
}
