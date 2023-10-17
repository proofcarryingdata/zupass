import {
  ZUCONNECT_PRODUCT_ID_MAPPINGS,
  ZuzaluUserRole
} from "@pcd/passport-interface";

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
 * For convenience, a map for looking up product ID-> event ID.
 */
const ZUCONNECT_PRODUCT_ID_EVENT_IDS = new Map(
  Object.values(ZUCONNECT_PRODUCT_ID_MAPPINGS).map((item) => [
    item.id,
    item.eventId
  ])
);

/**
 * Given a product ID, get the name (used for naming tickets).
 */
export function zuconnectProductIdToName(productId: string): string {
  return ZUCONNECT_PRODUCT_ID_NAMES.get(productId) ?? "Ticket";
}

/**
 * Given a product ID, get the event ID.
 */
export function zuconnectProductIdToEventId(productId: string): string {
  if (!ZUCONNECT_PRODUCT_ID_EVENT_IDS.has(productId)) {
    throw new Error(`Product ID ${productId} does not exist`);
  }
  return ZUCONNECT_PRODUCT_ID_EVENT_IDS.get(productId) as string;
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
