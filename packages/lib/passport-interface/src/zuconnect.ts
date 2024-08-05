import { ZuzaluUserRole } from "./zuzalu.js";

/**
 * These are the "ticket names" we get back from the Tripsha API.
 */
export const ZUCONNECT_TICKET_NAMES = [
  "ZuConnect Resident Pass",
  "1st Week Pass",
  "ZuConnect Scholarship",
  "ZuConnect Organizer Pass",
  "For people only using Day Passes (add-ons)",
  "Latecomer Pass"
] as const;

export type ZuconnectTicketType = (typeof ZUCONNECT_TICKET_NAMES)[number];

// Event IDs for Zuconnect
export const ZUCONNECT_23_RESIDENT_EVENT_ID =
  "91312aa1-5f74-4264-bdeb-f4a3ddb8670c";
export const ZUCONNECT_23_FIRST_WEEK_EVENT_ID =
  "54863995-10c4-46e4-9342-75e48b68d307";
export const ZUCONNECT_23_SCHOLARSHIP_EVENT_ID =
  "797de414-2aec-4ef8-8655-09df7e2b6cc6";
export const ZUCONNECT_23_ORGANIZER_EVENT_ID =
  "f7370f63-b9ae-480c-9ded-0663f1922bef";
export const ZUCONNECT_23_DAY_PASS_EVENT_ID =
  "a6109324-7ca0-4198-9583-77962d1b9d53";

// Product IDs for Zuconnect
export const ZUCONNECT_23_RESIDENT_PRODUCT_ID =
  "cc9e3650-c29b-4629-b275-6b34fc70b2f9";
export const ZUCONNECT_23_FIRST_WEEK_PRODUCT_ID =
  "d2123bf9-c027-4851-b52c-d8b73fc3f5af";
export const ZUCONNECT_23_SCHOLARSHIP_PRODUCT_ID =
  "d3620f38-56a9-4235-bea8-0d1dba6bb623";
export const ZUCONNECT_23_ORGANIZER_PRODUCT_ID =
  "0179ed5b-f265-417c-aeaa-ac61a525c6b0";
export const ZUCONNECT_23_DAY_PASS_PRODUCT_ID =
  "98437d28-0a39-4f40-9f2a-b38bf04cb55d";

/**
 * Maps from ticket "names" from Tripsha to UUIDs, user-facing names, and
 * equivalent Zuzalu roles (for Semaphore Group setup).
 */
export const ZUCONNECT_PRODUCT_ID_MAPPINGS: {
  [key in ZuconnectTicketType]: {
    id: string;
    eventId: string;
    name: string;
    zuzaluRoleEquivalent: ZuzaluUserRole;
  };
} = {
  "ZuConnect Resident Pass": {
    id: ZUCONNECT_23_RESIDENT_PRODUCT_ID,
    eventId: ZUCONNECT_23_RESIDENT_EVENT_ID,
    name: "Resident",
    zuzaluRoleEquivalent: ZuzaluUserRole.Resident
  },
  "ZuConnect Scholarship": {
    id: ZUCONNECT_23_SCHOLARSHIP_PRODUCT_ID,
    eventId: ZUCONNECT_23_SCHOLARSHIP_EVENT_ID,
    name: "Resident",
    zuzaluRoleEquivalent: ZuzaluUserRole.Resident
  },
  "1st Week Pass": {
    id: ZUCONNECT_23_FIRST_WEEK_PRODUCT_ID,
    eventId: ZUCONNECT_23_FIRST_WEEK_EVENT_ID,
    name: "Resident",
    zuzaluRoleEquivalent: ZuzaluUserRole.Resident
  },
  "ZuConnect Organizer Pass": {
    id: ZUCONNECT_23_ORGANIZER_PRODUCT_ID,
    eventId: ZUCONNECT_23_ORGANIZER_EVENT_ID,
    name: "Organizer",
    zuzaluRoleEquivalent: ZuzaluUserRole.Organizer
  },
  "For people only using Day Passes (add-ons)": {
    id: ZUCONNECT_23_DAY_PASS_PRODUCT_ID,
    eventId: ZUCONNECT_23_DAY_PASS_EVENT_ID,
    name: "Visitor",
    zuzaluRoleEquivalent: ZuzaluUserRole.Visitor
  },
  "Latecomer Pass": {
    id: ZUCONNECT_23_RESIDENT_PRODUCT_ID,
    eventId: ZUCONNECT_23_RESIDENT_EVENT_ID,
    name: "Resident",
    zuzaluRoleEquivalent: ZuzaluUserRole.Resident
  }
};
