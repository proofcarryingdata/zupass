import {
  getZuzaluPretixConfig,
  IZuzaluPretixAPI,
  ZuzaluPretixOrder,
  ZuzaluPretixSubevent
} from "../../src/apis/zuzaluPretixAPI";
import { logger } from "../../src/util/logger";
import {
  IMockPretixData,
  ZuzaluPretixDataMocker
} from "./zuzaluPretixDataMocker";

export function newMockZuzaluPretixAPI(): IZuzaluPretixAPI | null {
  const config = getZuzaluPretixConfig();

  if (!config) {
    return null;
  }

  const mocker = new ZuzaluPretixDataMocker(config);
  const mockData = mocker.getMockData();
  return getMockPretixAPI(mockData);
}

export function getMockPretixAPI(
  mockData: IMockPretixData,
  options?: {
    throwOnFetchOrders?: boolean;
    throwOnFetchSubevents?: boolean;
  }
): IZuzaluPretixAPI {
  return {
    config: mockData.config,
    fetchOrders: async (eventID: string): Promise<ZuzaluPretixOrder[]> => {
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
    fetchSubevents: async (
      parentId: string
    ): Promise<ZuzaluPretixSubevent[]> => {
      const result = mockData.subEventsByParentEventId.get(parentId) ?? [];
      if (options?.throwOnFetchSubevents) {
        throw new Error(`[MOCK] throwing for 'fetchSubevents'`);
      }
      logger(
        `[MOCK] fetchSubevents('${parentId}') =>`,
        JSON.stringify(result, null, 2)
      );
      return result;
    }
  };
}
