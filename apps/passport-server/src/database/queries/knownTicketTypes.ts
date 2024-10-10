import { KnownPublicKeyType, KnownTicketGroup } from "@pcd/passport-interface";
import { PoolClient } from "postgres-pool";
import {
  KnownPublicKeyDB,
  KnownTicketType,
  KnownTicketTypeWithKey
} from "../models";
import { sqlQuery } from "../sqlQuery";

/**
 * Fetches known public keys from the database.
 */
export async function fetchKnownPublicKeys(
  client: PoolClient
): Promise<KnownPublicKeyDB[]> {
  const result = await sqlQuery(client, `SELECT * FROM known_public_keys`);

  return result.rows;
}

/**
 * Sets the known public key. Replaces an existing value if a key of the
 * same name and type already exists.
 */
export async function setKnownPublicKey(
  client: PoolClient,
  publicKeyName: string,
  publicKeyType: KnownPublicKeyType,
  publicKey: string
): Promise<void> {
  await sqlQuery(
    client,
    `\
    INSERT INTO known_public_keys VALUES ($1, $2, $3)
    ON CONFLICT (public_key_name, public_key_type) DO UPDATE
    SET public_key = $3
    `,
    [publicKeyName, publicKeyType, publicKey]
  );
}

/**
 * Fetches known ticket details, including public key.
 * Doesn't query on public key because it's a JSON type and, although we
 * know the shape of EdDSA public keys, we can leave it to the caller to
 * check that the public key matches the one that they expect.
 */
export async function fetchKnownTicketByEventAndProductId(
  client: PoolClient,
  eventId: string,
  productId: string
): Promise<KnownTicketTypeWithKey | null> {
  const result = await sqlQuery(
    client,
    `SELECT s.*, k.public_key FROM known_ticket_types s 
    JOIN known_public_keys k ON s.known_public_key_name = k.public_key_name
    AND s.known_public_key_type = k.public_key_type
    WHERE s.event_id = $1 AND s.product_id = $2`,
    [eventId, productId]
  );

  return result.rows[0] ?? null;
}

/**
 * List all of the known tickets.
 */
export async function fetchKnownTicketTypes(
  client: PoolClient
): Promise<KnownTicketTypeWithKey[]> {
  const result = await sqlQuery(
    client,
    `
  SELECT s.*, k.public_key
  FROM known_ticket_types s
  JOIN known_public_keys k ON s.known_public_key_name = k.public_key_name
  AND s.known_public_key_type = k.public_key_type
  `
  );

  return result.rows;
}

/**
 * Sets the values for a known ticket type. If a ticket type with the same
 * identifier already exists, will replace existing values.
 */
export async function setKnownTicketType(
  client: PoolClient,
  identifier: string,
  eventId: string,
  productId: string,
  knownPublicKeyName: string,
  knownPublicKeyType: KnownPublicKeyType,
  ticketGroup: KnownTicketGroup,
  eventName: string
): Promise<KnownTicketType> {
  const result = await sqlQuery(
    client,
    `INSERT INTO known_ticket_types VALUES($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (identifier) DO UPDATE 
    SET event_id = $2, product_id = $3, known_public_key_name = $4,
    known_public_key_type = $5, ticket_group = $6, event_name = $7`,
    [
      identifier,
      eventId,
      productId,
      knownPublicKeyName,
      knownPublicKeyType,
      ticketGroup,
      eventName
    ]
  );

  return result.rows[0];
}

/**
 * Deletes a known ticket type.
 */
export async function deleteKnownTicketType(
  client: PoolClient,
  identifier: string
): Promise<void> {
  await sqlQuery(
    client,
    `DELETE FROM known_ticket_types WHERE identifier = $1`,
    [identifier]
  );
}

/**
 * Fetch ticket types belonging to a group.
 */
export async function fetchKnownTicketTypesByGroup(
  client: PoolClient,
  ticketGroup: KnownTicketGroup
): Promise<KnownTicketType[]> {
  const result = await sqlQuery(
    client,
    `SELECT * FROM known_ticket_types WHERE ticket_group = $1`,
    [ticketGroup]
  );

  return result.rows;
}
