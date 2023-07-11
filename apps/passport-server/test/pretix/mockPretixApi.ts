import {
  getPretixConfig,
  IPretixAPI,
  PretixOrder,
  PretixSubevent,
} from "../../src/apis/pretixAPI";
import { logger } from "../../src/util/logger";
import {
  IMockPretixData,
  ZuzaluPretixDataMocker,
} from "./zuzaluPretixDataMocker";

export function newMockZuzaluPretixAPI(): IPretixAPI | null {
  const config = getPretixConfig();

  if (!config) {
    return null;
  }

  const mocker = new ZuzaluPretixDataMocker(config);
  const mockData = mocker.getMockData();
  logger("[MOCK] zuzalu pretix data", mockData);
  return getMockPretixAPI(mockData);
}

export function getMockPretixAPI(
  mockData: IMockPretixData,
  options?: {
    throwOnFetchOrders?: boolean;
    throwOnFetchSubevents?: boolean;
  }
): IPretixAPI {
  logger("[MOCK] instantiating mock zuzalu pretix api");

  return {
    config: mockData.config,
    fetchOrders: async (eventID: string): Promise<PretixOrder[]> => {
      const result = mockData.ordersByEventId.get(eventID) ?? [];
      if (options?.throwOnFetchOrders) {
        throw new Error(`[MOCK] throwing for 'fetchOrders'`);
      }
      logger(
        `[MOCK] fetchOrders('${eventID}') =>`,
        JSON.stringify(result, null, 2)
      );
      return result;
    },
    fetchSubevents: async (parentId: string): Promise<PretixSubevent[]> => {
      const result = mockData.subEventsByParentEventId.get(parentId) ?? [];
      if (options?.throwOnFetchSubevents) {
        throw new Error(`[MOCK] throwing for 'fetchSubevents'`);
      }
      logger(
        `[MOCK] fetchSubevents('${parentId}') =>`,
        JSON.stringify(result, null, 2)
      );
      return result;
    },
  };
}
