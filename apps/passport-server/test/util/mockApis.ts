import chai from "chai";
import { getDevconnectPretixAPI } from "../../src/apis/devconnect/devconnectPretixAPI";
import { IEmailAPI } from "../../src/apis/emailAPI";
import {
  IRecaptchaAPI,
  RecaptchaV3APIResponse
} from "../../src/apis/recaptchaAPI";
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
  let recaptchaAPI: IRecaptchaAPI | null;

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

  if (apiOverrides?.recaptchaAPI) {
    recaptchaAPI = apiOverrides.recaptchaAPI;
  } else {
    recaptchaAPI = {
      send: (): Promise<RecaptchaV3APIResponse> => {
        return Promise.resolve({
          success: true,
          value: {
            success: true,
            score: 0.9,
            action: "test",
            challenge_ts: new Date().toISOString(),
            hostname: "localhost"
          }
        });
      }
    };
  }

  if (recaptchaAPI && chai.spy) {
    chai.spy.on(recaptchaAPI, "send");
  }

  return {
    emailAPI,
    zuzaluPretixAPI: pretixAPI,
    devconnectPretixAPIFactory,
    zuconnectTripshaAPI,
    recaptchaAPI
  };
}
