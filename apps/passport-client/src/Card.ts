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
  /** Cryptographic secret. Interpetation depends on `type`. */
  secret: string;
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
