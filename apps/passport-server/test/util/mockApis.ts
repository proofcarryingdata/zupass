import chai from "chai";
import { getDevconnectPretixAPI } from "../../src/apis/devconnect/devconnectPretixAPI";
import { IEmailAPI } from "../../src/apis/emailAPI";
import { IPretixAPI } from "../../src/apis/pretixAPI";
import { DevconnectPretixAPIFactory } from "../../src/services/devconnectPretixSyncService";
import { APIs } from "../../src/types";
import { newMockZuzaluPretixAPI } from "../pretix/mockPretixApi";

export function mockAPIs(apiOverrides?: Partial<APIs>): APIs {
  let emailAPI: IEmailAPI | null;
  let pretixAPI: IPretixAPI | null;
  let devconnectPretixAPIFactory: DevconnectPretixAPIFactory | null;

  if (apiOverrides?.emailAPI) {
    emailAPI = apiOverrides.emailAPI;
  } else {
    emailAPI = {
      send: (): Promise<void> => {
        return Promise.resolve();
      }
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

  if (apiOverrides?.devconnectPretixAPIFactory) {
    devconnectPretixAPIFactory = apiOverrides.devconnectPretixAPIFactory;
  } else {
    devconnectPretixAPIFactory = getDevconnectPretixAPI;
  }

  return {
    emailAPI,
    pretixAPI,
    devconnectPretixAPIFactory
  };
}
