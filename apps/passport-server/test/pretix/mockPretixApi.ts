import { IPretixAPI } from "../../src/apis/pretixAPI";
import {
  IMockPretixData,
  ZuzaluPretixDataMocker,
} from "./zuzaluPretixDataMocker";

export function getMockZuzaluPretixAPI(): IPretixAPI {
  const mocker = new ZuzaluPretixDataMocker();
  const mockData = mocker.mockData();
  console.log("[MOCK] zuzalu pretix data", mockData);
  return getMockPretixAPI(mockData);
}

export function getMockPretixAPI(mockData: IMockPretixData): IPretixAPI {
  return {
    config: mockData.config,
    fetchOrders: async (eventID: string) => {
      const result = mockData.ordersByEventId.get(eventID) ?? [];
      console.log(`[MOCK] fetchOrders('${eventID}') =>`, result);
      return result;
    },
    fetchSubevents: async (parentId: string) => {
      const result = mockData.subEventsByParentEventId.get(parentId) ?? [];
      console.log(`[MOCK] fetchSubevents('${parentId}') =>`, result);
      return result;
    },
  };
}
