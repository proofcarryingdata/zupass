import { RestRequest, rest } from "msw";
import { SetupServer, setupServer } from "msw/node";
import {
  DevconnectPretixEvent,
  DevconnectPretixEventSettings,
  DevconnectPretixItem,
  DevconnectPretixOrder,
  IDevconnectPretixAPI
} from "../../src/apis/devconnect/devconnectPretixAPI";
import { logger } from "../../src/util/logger";
import {
  DevconnectPretixDataMocker,
  IMockDevconnectPretixData
} from "./devconnectPretixDataMocker";

function getAuthToken(req: RestRequest): string | undefined {
  return req.headers.get("Authorization")?.split(" ")[1];
}

export function getDevconnectMockPretixAPIServer(
  mockData: IMockDevconnectPretixData
): SetupServer {
  const handlers = [];

  for (const [orgUrl, org] of mockData.organizersByOrgUrl) {
    handlers.push(
      rest.get(orgUrl + "/events", (req, res, ctx) => {
        if (getAuthToken(req) !== org.token) {
          return res(ctx.status(403), ctx.text("Invalid token"));
        }
        return res(
          ctx.json({ results: [...org.eventByEventID.values()], next: null })
        );
      })
    );

    handlers.push(
      rest.get(orgUrl + "/events/:event", (req, res, ctx) => {
        if (getAuthToken(req) !== org.token) {
          return res(ctx.status(403), ctx.text("Invalid token"));
        }
        const event = org.eventByEventID.get(req.params.event as string);
        if (!event) {
          return res(ctx.status(404));
        }
        return res(ctx.json(event));
      })
    );

    handlers.push(
      rest.get(orgUrl + "/events/:event/items", (req, res, ctx) => {
        if (getAuthToken(req) !== org.token) {
          return res(ctx.status(403), ctx.text("Invalid token"));
        }
        const items = org.itemsByEventID.get(req.params.event as string) ?? [];
        return res(ctx.json({ results: items, next: null }));
      })
    );

    handlers.push(
      rest.get(orgUrl + "/events/:event/orders", (req, res, ctx) => {
        if (getAuthToken(req) !== org.token) {
          return res(ctx.status(403), ctx.text("Invalid token"));
        }
        const orders =
          org.ordersByEventID.get(req.params.event as string) ?? [];
        return res(ctx.json({ results: orders, next: null }));
      })
    );

    handlers.push(
      rest.get(orgUrl + "/events/:event/settings", (req, res, ctx) => {
        if (getAuthToken(req) !== org.token) {
          return res(ctx.status(403), ctx.text("Invalid token"));
        }
        const settings = org.settingsByEventID.get(req.params.event as string);
        return res(ctx.json(settings));
      })
    );
  }

  const server = setupServer(...handlers);

  return server;
}

export function newMockDevconnectPretixAPI(): IDevconnectPretixAPI {
  const mocker = new DevconnectPretixDataMocker();
  const mockData = mocker.get();
  logger("[MOCK] devconnect pretix data", mockData);
  return getDevconnectMockPretixAPI(mockData);
}

export function getDevconnectMockPretixAPI(
  mockData: IMockDevconnectPretixData
): IDevconnectPretixAPI {
  logger("[MOCK] instantiating mock devconnect pretix api");

  return {
    fetchAllEvents: async (
      orgUrl: string,
      token: string
    ): Promise<DevconnectPretixEvent[]> => {
      const org = mockData.organizersByOrgUrl.get(orgUrl);
      if (!org) throw new Error(`missing org ${orgUrl}`);
      if (org.token !== token)
        throw new Error(`incorrect token ${token} for org ${orgUrl}`);
      return [...org.eventByEventID.values()];
    },
    fetchEvent: async (
      orgUrl: string,
      token: string,
      eventID: string
    ): Promise<DevconnectPretixEvent> => {
      const org = mockData.organizersByOrgUrl.get(orgUrl);
      if (!org) throw new Error(`missing org ${orgUrl}`);
      if (org.token !== token)
        throw new Error(`incorrect token ${token} for org ${orgUrl}`);
      const event = org.eventByEventID.get(eventID);
      if (event) {
        return event;
      }
      throw new Error("404 event not found");
    },
    fetchItems: async (
      orgUrl,
      token,
      eventId
    ): Promise<DevconnectPretixItem[]> => {
      const org = mockData.organizersByOrgUrl.get(orgUrl);
      if (!org) throw new Error(`missing org ${orgUrl}`);
      if (org.token !== token)
        throw new Error(`incorrect token ${token} for org ${orgUrl}`);
      return org.itemsByEventID.get(eventId) ?? [];
    },
    fetchOrders: async (
      orgUrl: string,
      token: string,
      eventID: string
    ): Promise<DevconnectPretixOrder[]> => {
      const org = mockData.organizersByOrgUrl.get(orgUrl);
      if (!org) throw new Error(`missing org ${orgUrl}`);
      if (org.token !== token)
        throw new Error(`incorrect token ${token} for org ${orgUrl}`);
      const result = org.ordersByEventID.get(eventID) ?? [];
      logger(
        `[MOCK] fetchOrders('${eventID}') =>`,
        JSON.stringify(result, null, 2)
      );
      return result;
    },
    fetchEventSettings: async (
      orgUrl: string,
      token: string,
      eventID: string
    ): Promise<DevconnectPretixEventSettings> => {
      const org = mockData.organizersByOrgUrl.get(orgUrl);
      if (!org) throw new Error(`missing org ${orgUrl}`);
      if (org.token !== token)
        throw new Error(`incorrect token ${token} for org ${orgUrl}`);

      const result = org.settingsByEventID.get(eventID);

      logger(
        `[MOCK] fetchEventSettings('${eventID}') =>`,
        JSON.stringify(result, null, 2)
      );

      if (result) {
        return result;
      } else {
        throw new Error("Event settings not found");
      }
    },
    cancelPendingRequests: (): void => {
      // Nothing to do here
      return;
    }
  };
}
