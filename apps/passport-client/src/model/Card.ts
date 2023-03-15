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
  display: CardDisplay;

  // TODO: underlying secret PCD
  // TODO: id-specific extra information
}

export interface CardZID extends Card {
  type: "zuzalu-id";
  /** Identity, produces the displayed PCD. */
  identity: Identity;
}

export interface CardDisplay {
  /** eg "Zuzalu Resident" */
  header: string;
  /** eg "Vitalik Buterin" */
  title: string;
  /** eg "Zuzalu resident #183" */
  description: string;
  /** eg "🧑‍🦱" */
  icon: string;
  /** eg "#669966" */
  color: string;
}
