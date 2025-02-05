import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  requestPollFeed,
  ZUPASS_CREDENTIAL_REQUEST,
  ZupassFeedIds,
  ZUZALU_23_EVENT_ID
} from "@pcd/passport-interface";
import { isReplaceInFolderAction, PCDActionType } from "@pcd/pcd-collection";
import { PODTicketPCDPackage } from "@pcd/pod-ticket-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import { step } from "mocha-steps";
import MockDate from "mockdate";
import {
  getZuzaluPretixConfig,
  ZuzaluPretixOrder
} from "../src/apis/zuzaluPretixAPI";
import { stopApplication } from "../src/application";
import { Zupass } from "../src/types";
import { makeTestCredential } from "./generic-issuance/util";
import { getMockPretixAPI } from "./pretix/mockPretixApi";
import { expectZuzaluPretixToHaveSynced } from "./pretix/waitForPretixSyncStatus";
import { ZuzaluPretixDataMocker } from "./pretix/zuzaluPretixDataMocker";
import { testLogin } from "./user/testLogin";
import { overrideEnvironment, testingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";
import { expectToExist } from "./util/util";

describe("zuzalu-specific zupass functionality", function () {
  let application: Zupass;
  let pretixMocker: ZuzaluPretixDataMocker;
  let identity: Identity;
  let order: ZuzaluPretixOrder;

  this.beforeEach(() => {
    // Means that the time won't change during the test, which could cause
    // spurious issues with timestamps in feed credentials.
    MockDate.set(new Date());
  });

  this.afterEach(() => {
    MockDate.reset();
  });

  this.beforeAll(async () => {
    await overrideEnvironment(testingEnv);
    const pretixConfig = getZuzaluPretixConfig();

    if (!pretixConfig) {
      throw new Error(
        "expected to be able to get a pretix config for zuzalu tests"
      );
    }

    pretixMocker = new ZuzaluPretixDataMocker(pretixConfig);
    const pretixAPI = getMockPretixAPI(pretixMocker.getMockData());
    application = await startTestingApp({ zuzaluPretixAPI: pretixAPI });

    if (!application.services.zuzaluPretixSyncService) {
      throw new Error("expected there to be a pretix sync service");
    }
  });

  this.afterAll(async () => {
    await stopApplication(application);
  });

  step("zuzalu pretix should sync to completion", async function () {
    await expectZuzaluPretixToHaveSynced(application);
  });

  step("should be able to log in", async function () {
    order = pretixMocker.getResidentsAndOrganizers()[0];
    const result = await testLogin(application, order.email, {
      expectEmailIncorrect: false,
      expectUserAlreadyLoggedIn: false,
      force: false,
      skipSetupPassword: false
    });

    if (!result) {
      throw new Error("failed to log in");
    }

    identity = result.identity;
  });

  step(
    "user should be able to be issued Zuzalu ticket PCDs from the server",
    async function () {
      const response = await requestPollFeed(
        `${application.expressContext.localEndpoint}/feeds`,
        {
          pcd: await makeTestCredential(identity, ZUPASS_CREDENTIAL_REQUEST),
          feedId: ZupassFeedIds.Zuzalu_23
        }
      );

      if (!response.success) {
        throw new Error("expected to be able to poll the feed");
      }

      expect(response.value.actions.length).to.eq(2);
      const action = response.value.actions[1];
      expectToExist(action, isReplaceInFolderAction);

      expect(action.type).to.eq(PCDActionType.ReplaceInFolder);
      expect(action.folder).to.eq("Zuzalu '23");

      expect(Array.isArray(action.pcds)).to.eq(true);
      expect(action.pcds.length).to.eq(2);

      const [zuzaluTicketPCD, podTicketPCD] = action.pcds;
      expect(zuzaluTicketPCD.type).to.eq(EdDSATicketPCDPackage.name);

      const deserializedZuzaluTicketPCD =
        await EdDSATicketPCDPackage.deserialize(zuzaluTicketPCD.pcd);

      expect(deserializedZuzaluTicketPCD.claim.ticket.eventId).to.eq(
        ZUZALU_23_EVENT_ID
      );

      const verified = await EdDSATicketPCDPackage.verify(
        deserializedZuzaluTicketPCD
      );
      expect(verified).to.eq(true);

      expect(podTicketPCD.type).to.eq(PODTicketPCDPackage.name);

      const deserializedPodTicketPCD = await PODTicketPCDPackage.deserialize(
        podTicketPCD.pcd
      );

      expect(deserializedPodTicketPCD.claim.ticket.eventId).to.eq(
        ZUZALU_23_EVENT_ID
      );
    }
  );
});
