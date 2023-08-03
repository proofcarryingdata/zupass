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
    }
  };
}
