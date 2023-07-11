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
  EVENT_A,
  EVENT_B,
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
      const orders = await fetchAllDevconnectPretixTickets(
        application.context.dbPool
      );
      expect(orders).to.have.length(5);
      const ordersByTicketNameAndEventID = orders.map(
        ({ event_id, ticket_name }) => ({
          event_id,
          ticket_name,
        })
      );

      expect(ordersByTicketNameAndEventID).to.have.deep.members([
        { ticket_name: "item-1", event_id: EVENT_A },
        { ticket_name: "item-2", event_id: EVENT_A },
        { ticket_name: "item-1", event_id: EVENT_B },
        { ticket_name: "item-2", event_id: EVENT_B },
        { ticket_name: "item-2", event_id: EVENT_B },
      ]);
    }
  );

  this.afterAll(async () => {
    await stopApplication(application);
  });
});
