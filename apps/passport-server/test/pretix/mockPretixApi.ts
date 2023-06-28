import { getPretixConfig, IPretixAPI } from "../../src/apis/pretixAPI";
import { logger } from "../../src/util/logger";
import {
  IMockPretixData,
  ZuzaluPretixDataMocker,
} from "./zuzaluPretixDataMocker";

export function getMockZuzaluPretixAPI(): IPretixAPI | null {
  const config = getPretixConfig();

  if (!config) {
    return null;
  }

  const mocker = new ZuzaluPretixDataMocker(config);
  const mockData = mocker.mockData();
  logger("[MOCK] zuzalu pretix data", mockData);
  return getMockPretixAPI(mockData);
}

export function getMockPretixAPI(mockData: IMockPretixData): IPretixAPI {
  logger("[MOCK] instantiating mock zuzalu pretix api");

  return {
    config: mockData.config,
    fetchOrders: async (eventID: string) => {
      const result = mockData.ordersByEventId.get(eventID) ?? [];
      logger(`[MOCK] fetchOrders('${eventID}') =>`, result);
      return result;
    },
    fetchSubevents: async (parentId: string) => {
      const result = mockData.subEventsByParentEventId.get(parentId) ?? [];
      logger(`[MOCK] fetchSubevents('${parentId}') =>`, result);
      return result;
    },
  };
}
