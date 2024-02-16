import {
  ZUZALU_23_ORGANIZER_PRODUCT_ID,
  ZUZALU_23_RESIDENT_PRODUCT_ID,
  ZUZALU_23_VISITOR_PRODUCT_ID,
  ZupassUserJson,
  ZuzaluUserRole
} from "@pcd/passport-interface";
import _ from "lodash";
import { UserRow, ZuzaluPretixTicket } from "../database/models";

/**
 * Sometimes the ticket we load from pretix is updated.
 * This function detects these changes.
 */
export function pretixTicketsDifferent(
  oldTicket: ZuzaluPretixTicket,
  newTicket: ZuzaluPretixTicket
): boolean {
  if (oldTicket.role !== newTicket.role) {
    return true;
  }

  if (
    !_.isEqual(oldTicket.visitor_date_ranges, newTicket.visitor_date_ranges)
  ) {
    return true;
  }

  if (oldTicket.name !== newTicket.name) {
    return true;
  }

  return false;
}

/**
 * Converts list of users to map indexed by email address.
 */
export function ticketsToMapByEmail(
  users: ZuzaluPretixTicket[]
): Map<string, ZuzaluPretixTicket> {
  return new Map(users.map((user) => [user.email, user]));
}

/**
 * Converts UserRow from database into ZupassUserJson to be returned from API.
 */
export function userRowToZupassUserJson(user: UserRow): ZupassUserJson {
  return Object.assign(
    {
      uuid: user.uuid,
      commitment: user.commitment,
      email: user.email,
      salt: user.salt,
      terms_agreed: user.terms_agreed
    } satisfies ZupassUserJson,
    {
      // TODO: remove this once we are sure that
      // 1) no old versions of the client are in the wild and
      // 2) once we figure out a way to clear old versions of the client programmatically.
      // Added in order to preserve compatibility. between older client versions and the
      // new version of the server.
      role: ZuzaluUserRole.Resident
    }
  );
}

export function zuzaluRoleToProductId(role: ZuzaluUserRole): string {
  return role === ZuzaluUserRole.Visitor
    ? ZUZALU_23_VISITOR_PRODUCT_ID
    : role === ZuzaluUserRole.Organizer
    ? ZUZALU_23_ORGANIZER_PRODUCT_ID
    : ZUZALU_23_RESIDENT_PRODUCT_ID;
}
