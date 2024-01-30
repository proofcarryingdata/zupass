import chai from "chai";
import { getDevconnectPretixAPI } from "../../src/apis/devconnect/devconnectPretixAPI";
import { IEmailAPI } from "../../src/apis/emailAPI";
import {
  ILemonadeAPI,
  getLemonadeAPI
} from "../../src/apis/lemonade/lemonadeAPI";
import {
  IZuconnectTripshaAPI,
  getZuconnectTripshaAPI
} from "../../src/apis/zuconnect/zuconnectTripshaAPI";
import { IZuzaluPretixAPI } from "../../src/apis/zuzaluPretixAPI";
import { DevconnectPretixAPIFactory } from "../../src/services/devconnectPretixSyncService";
import { APIs } from "../../src/types";
import { newMockZuzaluPretixAPI } from "../pretix/mockPretixApi";

export function mockAPIs(apiOverrides?: Partial<APIs>): APIs {
  let emailAPI: IEmailAPI | null;
  let pretixAPI: IZuzaluPretixAPI | null;
  let devconnectPretixAPIFactory: DevconnectPretixAPIFactory | null;
  let zuconnectTripshaAPI: IZuconnectTripshaAPI | null;
  let lemonadeAPI: ILemonadeAPI | null;

  if (apiOverrides?.emailAPI) {
    emailAPI = apiOverrides.emailAPI;
  } else {
    emailAPI = {
      send: (): Promise<void> => {
        return Promise.resolve();
      }
    };
  }

  if (emailAPI && chai.spy) {
    chai.spy.on(emailAPI, "send");
  }

  if (apiOverrides?.zuzaluPretixAPI) {
    pretixAPI = apiOverrides.zuzaluPretixAPI;
  } else {
    pretixAPI = newMockZuzaluPretixAPI();
  }

  if (apiOverrides?.devconnectPretixAPIFactory) {
    devconnectPretixAPIFactory = apiOverrides.devconnectPretixAPIFactory;
  } else {
    devconnectPretixAPIFactory = getDevconnectPretixAPI;
  }

  if (apiOverrides?.zuconnectTripshaAPI) {
    zuconnectTripshaAPI = apiOverrides.zuconnectTripshaAPI;
  } else {
    zuconnectTripshaAPI = getZuconnectTripshaAPI();
  }

  if (apiOverrides?.lemonadeAPI) {
    lemonadeAPI = apiOverrides.lemonadeAPI;
  } else {
    lemonadeAPI = getLemonadeAPI();
  }

  return {
    emailAPI,
    zuzaluPretixAPI: pretixAPI,
    devconnectPretixAPIFactory,
    zuconnectTripshaAPI,
    lemonadeAPI
  };
}
