import { ZuzaluUserRole } from "@pcd/passport-interface";
import { ZuconnectTicket } from "../apis/zuconnect/zuconnectTripshaAPI";
import {
  ZUCONNECT_23_ORGANIZER_PRODUCT_ID,
  ZUCONNECT_23_RESIDENT_PRODUCT_ID,
  ZUCONNECT_23_VISITOR_PRODUCT_ID
} from "./constants";

/**
 * Maps from ticket "types" from Tripsha to UUIDs, user-facing names, and
 * equivalent Zuzalu roles (for Semaphore Group setup).
 */
export const ZUCONNECT_PRODUCT_ID_MAPPINGS: {
  [key in ZuconnectTicket["ticketName"]]: {
    id: string;
    name: string;
    zuzaluRoleEquivalent: ZuzaluUserRole;
  };
} = {
  "ZuConnect Resident Pass": {
    id: ZUCONNECT_23_RESIDENT_PRODUCT_ID,
    name: "Resident",
    zuzaluRoleEquivalent: ZuzaluUserRole.Resident
  },
  "ZuConnect Scholarship": {
    id: ZUCONNECT_23_RESIDENT_PRODUCT_ID,
    name: "Resident",
    zuzaluRoleEquivalent: ZuzaluUserRole.Resident
  },
  "1st Week Pass": {
    id: ZUCONNECT_23_RESIDENT_PRODUCT_ID,
    name: "Resident",
    zuzaluRoleEquivalent: ZuzaluUserRole.Resident
  },
  "ZuConnect Organizer Pass": {
    id: ZUCONNECT_23_ORGANIZER_PRODUCT_ID,
    name: "Organizer",
    zuzaluRoleEquivalent: ZuzaluUserRole.Organizer
  },
  "ZuConnect Visitor Pass": {
    id: ZUCONNECT_23_VISITOR_PRODUCT_ID,
    name: "Visitor",
    zuzaluRoleEquivalent: ZuzaluUserRole.Visitor
  }
};

/**
 * For convenience, a map for looking up ID->name.
 */
const ZUCONNECT_PRODUCT_ID_NAMES = new Map(
  Object.values(ZUCONNECT_PRODUCT_ID_MAPPINGS).map((item) => [
    item.id,
    item.name
  ])
);

/**
 * For convenience, a map for looking up ID->Zuzalu role.
 */
const ZUCONNECT_PRODUCT_ID_ROLES = new Map(
  Object.values(ZUCONNECT_PRODUCT_ID_MAPPINGS).map((item) => [
    item.id,
    item.zuzaluRoleEquivalent
  ])
);

/**
 * Given a product ID, get the name (used for naming tickets).
 */
export function zuconnectProductIdToName(productId: string): string {
  return ZUCONNECT_PRODUCT_ID_NAMES.get(productId) ?? "Ticket";
}

/**
 * Given a product ID, get the equivalent Zuzalu role (used when generating)
 * Semaphore Groups.
 */
export function zuconnectProductIdToZuzaluRole(
  productId: string
): ZuzaluUserRole {
  return ZUCONNECT_PRODUCT_ID_ROLES.get(productId) ?? ZuzaluUserRole.Visitor;
}
