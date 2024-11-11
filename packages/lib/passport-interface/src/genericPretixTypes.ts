import { z } from "zod";

/**
 * Return an English-language string if one exists, otherwise the first
 */
export function getI18nString(map: GenericPretixI18nMap): string {
  return map["en"] ?? Object.values(map)[0];
}

/**
 * Pretix API types
 *
 * A Zod schema is used to ensure that the data has the expected form.
 * Clients may do additional validation, for instance to ensure that events
 * have the expected products, or that event settings match those that we
 * require. Those checks are not part of the schema.
 *
 * The comments below are copied from the original Devconnect Pretix API
 * client.
 */

export const GenericPretixI18MapSchema = z.record(z.string());

// This records when an attendee was checked in
const GenericPretixCheckinSchema = z.object({
  datetime: z.string(),
  type: z.enum(["entry", "exit"])
});

// This records all attendee answers to questions that they
// filled in when purchasing their ticket
const GenericPretixAnswerSchema = z.object({
  question: z.number(),
  answer: z.string(),
  question_identifier: z.string(),
  options: z.array(z.number()),
  option_identifiers: z.array(z.string())
});
export type GenericPretixAnswer = z.infer<typeof GenericPretixAnswerSchema>;

// Unclear why this is called a "position" rather than a ticket.
const GenericPretixPositionSchema = z.object({
  id: z.number(),
  order: z.string(), // "Q0BHN"
  positionid: z.number(),
  item: z.number(),
  price: z.string(),
  attendee_name: z.string().optional().nullable(), // first and last
  attendee_email: z.string().toLowerCase().trim().nullable(),
  subevent: z.number().nullable(),
  secret: z.string(),
  checkins: z.array(GenericPretixCheckinSchema),
  addon_to: z.number().nullable(), // id of the position this is an add-on to
  variation: z.number().nullable(), // id of the purchased variation
  answers: z.array(GenericPretixAnswerSchema).optional()
});

// A Pretix order. For our purposes, each order contains one ticket.
export const GenericPretixOrderSchema = z.object({
  code: z.string(), // "Q0BHN"
  status: z.string(), // "p"
  testmode: z.boolean(),
  secret: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().toLowerCase().trim(),
  positions: z.array(GenericPretixPositionSchema) // should have exactly one
});

export const GenericPretixProductSchema = z.object({
  id: z.number(), // corresponds to "item" field in GenericPretixPosition
  category: z.number().optional().nullable(),
  admission: z.boolean(),
  personalized: z.boolean(),
  generate_tickets: z.boolean().nullable().optional(),
  name: GenericPretixI18MapSchema
});

export const GenericPretixEventSchema = z.object({
  slug: z.string(), // corresponds to "event_id" field in our db
  name: GenericPretixI18MapSchema
});

export const GenericPretixEventSettingsSchema = z.object({
  // These settings control whether individual attendees must have
  // email addresses specified.
  // Corresponds to the "Ask for email addresses per ticket" setting
  // in the "Customer and attendee data" section of event settings
  // in the Pretix UI.
  attendee_emails_asked: z.boolean(),
  attendee_emails_required: z.boolean()
});

/**
 * All tickets must be configured as "personalized", with the exception of
 * "add-ons", and an add-on is recognized by its category. The use-case
 * for non-personalized add-on tickets was Devconnect towels.
 *
 * To date, we only care about categories for the purpose of ensuring that
 * non-personalized tickets are, indeed, add-ons. No category data is persisted,
 * as it's used only for validation.
 *
 * Category API docs: https://docs.pretix.eu/en/latest/api/resources/categories.html
 *
 * See #1119 for original implementation.
 */
export const GenericPretixProductCategorySchema = z.object({
  id: z.number(),
  is_addon: z.boolean()
  // TODO: load category name
});

// Each event has one or more check-in lists
// We only care about these because we need the list ID for check-in sync
export const GenericPretixCheckinListSchema = z.object({
  id: z.number(),
  name: z.string()
});

export type GenericPretixI18nMap = z.infer<typeof GenericPretixI18MapSchema>;
export type GenericPretixOrder = z.infer<typeof GenericPretixOrderSchema>;
export type GenericPretixProduct = z.infer<typeof GenericPretixProductSchema>;
export type GenericPretixEvent = z.infer<typeof GenericPretixEventSchema>;
export type GenericPretixEventSettings = z.infer<
  typeof GenericPretixEventSettingsSchema
>;
export type GenericPretixProductCategory = z.infer<
  typeof GenericPretixProductCategorySchema
>;
export type GenericPretixCheckinList = z.infer<
  typeof GenericPretixCheckinListSchema
>;
export type GenericPretixCheckin = z.infer<typeof GenericPretixCheckinSchema>;
export type GenericPretixPosition = z.infer<typeof GenericPretixPositionSchema>;
