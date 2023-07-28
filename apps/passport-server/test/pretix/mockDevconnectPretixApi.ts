import {
  DevconnectPretixEvent,
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
  const mockData = mocker.getMockData();
  logger("[MOCK] devconnect pretix data", mockData);
  return getDevconnectMockPretixAPI(mockData);
}

export function getDevconnectMockPretixAPI(
  mockData: IMockDevconnectPretixData
): IDevconnectPretixAPI {
  logger("[MOCK] instantiating mock devconnect pretix api");

  return {
    fetchAllEvents: async (
      _orgURL: string,
      _token: string
    ): Promise<DevconnectPretixEvent[]> => {
      return [...mockData.eventNameByEventID.entries()].map((e) => ({
        slug: e[0],
        name: { en: e[1] }
      }));
    },
    fetchEvent: async (
      _orgURL: string,
      _token: string,
      eventID: string
    ): Promise<DevconnectPretixEvent> => {
      const eventName = mockData.eventNameByEventID.get(eventID);
      if (eventName) {
        return {
          slug: eventID,
          name: { en: eventName }
        };
      }
      throw new Error("404 event not found");
    },
    fetchItems: async (
      _orgUrl,
      _token,
      eventId
    ): Promise<DevconnectPretixItem[]> => {
      return mockData.itemsByEventID.get(eventId) ?? [];
    },
    fetchOrders: async (
      _orgUrl: string,
      _token: string,
      eventID: string
    ): Promise<DevconnectPretixOrder[]> => {
      const result = mockData.ordersByEventID.get(eventID) ?? [];
      logger(
        `[MOCK] fetchOrders('${eventID}') =>`,
        JSON.stringify(result, null, 2)
      );
      return result;
    }
  };
}
