import { ZuParticipant } from "@pcd/passport-interface";
import { Identity } from "@semaphore-protocol/identity";

/**
 * Card model. Each card has an ID, display information, a way of generating a
 * public proof, and private information.
 */
export interface Card {
  /** Opaque unique ID */
  id: string;
  /** eg "zuzalu-id" */
  type: string;
  /** Basic in-wallet display information. */
  header: string;
}

/**
 * Represents an (owned or revealed) Zuzalu participant identity.
 */
export interface ZuIdCard extends Card {
  type: "zuzalu-id";
  /** Participant */
  participant: ZuParticipant;
  /** Identity (for our own, owned card) produces the displayed PCD.
   * For someone else's verified card, it's undefined and no QR is shown. */
  identity?: Identity;
}
