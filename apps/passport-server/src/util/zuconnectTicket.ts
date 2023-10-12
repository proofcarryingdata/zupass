import { ZuzaluUserRole } from "@pcd/passport-interface";
import { ZuconnectTicket } from "../apis/zuconnect/zuconnectTripshaAPI";

/**
 * Maps from ticket "types" from Tripsha to UUIDs, user-facing names, and
 * equivalent Zuzalu roles (for Semaphore Group setup).
 */
export const ZUCONNECT_PRODUCT_ID_MAPPINGS: {
  [key in ZuconnectTicket["type"]]: {
    id: string;
    name: string;
    zuzaluRoleEquivalent: ZuzaluUserRole;
  };
} = {
  "ZuConnect Resident Pass": {
    id: "cc9e3650-c29b-4629-b275-6b34fc70b2f9",
    name: "Resident",
    zuzaluRoleEquivalent: ZuzaluUserRole.Resident
  },
  "ZuConnect Organizer Pass": {
    id: "NOT-CONFIRMED-DO-NOT-USE",
    name: "Organizer",
    zuzaluRoleEquivalent: ZuzaluUserRole.Organizer
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
