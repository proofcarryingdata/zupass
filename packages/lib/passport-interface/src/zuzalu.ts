import { ZupassUserJson } from "./RequestTypes";

export type User = ZupassUserJson;

export const enum ZuzaluUserRole {
  Visitor = "visitor",
  Resident = "resident",
  Organizer = "organizer"
}

// Since Zuzalu did not have event or product UUIDs at the time, we can
// allocate some constant ones now.
export const ZUZALU_23_RESIDENT_PRODUCT_ID =
  "5ba4cd9e-893c-4a4a-b15b-cf36ceda1938";
export const ZUZALU_23_VISITOR_PRODUCT_ID =
  "53b518ed-e427-4a23-bf36-a6e1e2764256";
export const ZUZALU_23_ORGANIZER_PRODUCT_ID =
  "10016d35-40df-4033-a171-7d661ebaccaa";
export const ZUZALU_23_EVENT_ID = "5de90d09-22db-40ca-b3ae-d934573def8b";
