import { IPretixAPI } from "../../src/apis/pretixAPI";
import {
  IMockPretixData,
  ZuzaluPretixDataMocker,
} from "./zuzaluPretixDataMocker";

export function getMockZuzaluPretixAPI(): IPretixAPI {
  const mocker = new ZuzaluPretixDataMocker();
  const mockData = mocker.mockData();
  return getMockPretixAPI(mockData);
}

export function getMockPretixAPI(mockData: IMockPretixData): IPretixAPI {
  return {
    config: {
      orgUrl: "no-url",
      token: "fake-token",
      zuEventID: "zu-event-id",
      zuEventOrganizersItemID: 0,
      zuVisitorEventID: "",
    },
    fetchOrders: async (eventID) => {
      return mockData.ordersByEventId.get(eventID) ?? [];
    },
    fetchSubevents: async (parentId) => {
      return mockData.subEventsByParentEventId.get(parentId) ?? [];
    },
  };
}
