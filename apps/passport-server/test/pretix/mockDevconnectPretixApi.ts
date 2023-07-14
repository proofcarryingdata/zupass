import {
  DevconnectPretixEvent,
  DevconnectPretixItem,
  DevconnectPretixOrder,
  IDevconnectPretixAPI,
} from "../../src/apis/devconnectPretixAPI";
import { logger } from "../../src/util/logger";
import {
  DevconnectPretixDataMocker,
  EVENT_A,
  EVENT_A_CONFIG_ID,
  EVENT_B,
  EVENT_B_CONFIG_ID,
  EVENT_C,
  EVENT_C_CONFIG_ID,
  IMockDevconnectPretixData,
  ITEM_1,
  ITEM_2,
  ORG_CONFIG_ID,
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
    config: {
      organizers: [
        {
          id: ORG_CONFIG_ID,
          orgURL: "organizer-url",
          token: "token",
          events: [
            {
              id: EVENT_A_CONFIG_ID,
              eventID: EVENT_A,
              activeItemIDs: [ITEM_1.toString()],
            },
            {
              id: EVENT_B_CONFIG_ID,
              eventID: EVENT_B,
              activeItemIDs: [ITEM_1.toString(), ITEM_2.toString()],
            },
            {
              id: EVENT_C_CONFIG_ID,
              eventID: EVENT_C,
              activeItemIDs: [],
            },
          ],
        },
      ],
    },
    fetchEvent: async (
      _orgURL: string,
      eventID: string
    ): Promise<DevconnectPretixEvent> => {
      const eventName = mockData.eventNameByEventID.get(eventID);
      if (eventName) {
        return {
          slug: eventID,
          name: { en: eventName },
        };
      }
      throw new Error("404 event not found");
    },
    fetchItems: async (): Promise<DevconnectPretixItem[]> => {
      return [
        { id: ITEM_1, name: { en: "item-1" } },
        {
          id: ITEM_2,
          name: { en: "item-2" },
        },
      ];
    },
    fetchOrders: async (
      _orgUrl: string,
      _token: string,
      eventID: string
    ): Promise<DevconnectPretixOrder[]> => {
      const result = mockData.ordersByEventId.get(eventID) ?? [];
      logger(
        `[MOCK] fetchOrders('${eventID}') =>`,
        JSON.stringify(result, null, 2)
      );
      return result;
    },
  };
}
