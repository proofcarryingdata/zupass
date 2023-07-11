import {
  DevconnectPretixItem,
  IDevconnectPretixAPI,
} from "../../src/apis/devconnectPretixAPI";
import { PretixOrder } from "../../src/apis/pretixAPI";
import { logger } from "../../src/util/logger";
import {
  DevconnectPretixDataMocker,
  EVENT_A,
  EVENT_B,
  EVENT_C,
  IMockDevconnectPretixData,
  ITEM_1,
  ITEM_2,
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
          organizer_url: "organizer-url",
          event_ids: [EVENT_A, EVENT_B, EVENT_C],
          token: "token",
        },
      ],
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
    ): Promise<PretixOrder[]> => {
      const result = mockData.ordersByEventId.get(eventID) ?? [];
      logger(
        `[MOCK] fetchOrders('${eventID}') =>`,
        JSON.stringify(result, null, 2)
      );
      return result;
    },
  };
}
