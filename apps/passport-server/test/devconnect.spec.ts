import { expect } from "chai";
import "mocha";
import { IEmailAPI } from "../src/apis/emailAPI";
import { stopApplication } from "../src/application";
import { fetchAllDevconnectPretixTickets } from "../src/database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { DevconnectPretixSyncService } from "../src/services/devconnectPretixSyncService";
import { PretixSyncStatus } from "../src/services/types";
import { PCDPass } from "../src/types";
import {
  DevconnectPretixDataMocker,
  EMAIL_1,
  EMAIL_2,
  EMAIL_3,
  EMAIL_4,
  EVENT_A,
  EVENT_B,
  ITEM_1,
  ITEM_2,
} from "./pretix/devconnectPretixDataMocker";
import { getDevconnectMockPretixAPI } from "./pretix/mockDevconnectPretixApi";
import { waitForDevconnectPretixSyncStatus } from "./pretix/waitForDevconnectPretixSyncStatus";
import { overrideEnvironment, pcdpassTestingEnv } from "./util/env";
import { startTestingApp } from "./util/startTestingApplication";

describe("devconnect functionality", function () {
  this.timeout(15_000);

  let application: PCDPass;
  let _emailAPI: IEmailAPI;
  let devconnectPretixMocker: DevconnectPretixDataMocker;
  let _devconnectPretixSyncService: DevconnectPretixSyncService;

  this.beforeAll(async () => {
    await overrideEnvironment(pcdpassTestingEnv);

    devconnectPretixMocker = new DevconnectPretixDataMocker();
    const devconnectPretixAPI = getDevconnectMockPretixAPI(
      devconnectPretixMocker.getMockData()
    );
    application = await startTestingApp({ devconnectPretixAPI });

    if (!application.services.devconnectPretixSyncService) {
      throw new Error("expected there to be a pretix sync service");
    }

    _devconnectPretixSyncService =
      application.services.devconnectPretixSyncService;
  });

  step("email client should have been mocked", async function () {
    if (!application.apis.emailAPI) {
      throw new Error("email client should have been mocked");
    }
    _emailAPI = application.apis.emailAPI;
  });

  step("devconnect pretix status should sync to completion", async function () {
    const pretixSyncStatus = await waitForDevconnectPretixSyncStatus(
      application
    );
    expect(pretixSyncStatus).to.eq(PretixSyncStatus.Synced);
    // stop interval that polls the api so we have more granular control over
    // testing the sync functionality
    application.services.pretixSyncService?.stop();
  });

  step(
    "after devconnect pretix sync, database should reflect devconnect pretix API",
    async function () {
      const tickets = await fetchAllDevconnectPretixTickets(
        application.context.dbPool
      );

      // Four unique emails, two events with active items. 4 * 2 = 8
      // More details in comments below
      expect(tickets).to.have.length(8);

      const ticketsWithEmailEventAndItems = tickets.map((o) => ({
        eventID: o.event_id,
        email: o.email,
        itemIDs: o.item_ids,
      }));

      expect(ticketsWithEmailEventAndItems).to.have.deep.members([
        // Four tickets for event A because four unique emails
        {
          email: EMAIL_1,
          itemIDs: [ITEM_1, ITEM_1, ITEM_1],
          eventID: EVENT_A,
        },
        {
          email: EMAIL_2,
          itemIDs: [ITEM_1, ITEM_1],
          eventID: EVENT_A,
        },
        {
          email: EMAIL_3,
          itemIDs: [ITEM_1],
          eventID: EVENT_A,
        },
        {
          email: EMAIL_4,
          itemIDs: [ITEM_1],
          eventID: EVENT_A,
        },
        // Four tickets for event B because four unique emails
        {
          email: EMAIL_1,
          itemIDs: [ITEM_1, ITEM_1, ITEM_2, ITEM_2, ITEM_2, ITEM_1],
          eventID: EVENT_B,
        },
        {
          email: EMAIL_2,
          itemIDs: [ITEM_1, ITEM_1, ITEM_2, ITEM_2],
          eventID: EVENT_B,
        },
        {
          email: EMAIL_3,
          itemIDs: [ITEM_1],
          eventID: EVENT_B,
        },
        {
          email: EMAIL_4,
          itemIDs: [ITEM_1, ITEM_2],
          eventID: EVENT_B,
        },
        // None for event C, since no active items
      ]);
    }
  );

  this.afterAll(async () => {
    await stopApplication(application);
  });
});
