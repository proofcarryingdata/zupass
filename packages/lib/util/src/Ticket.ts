export type TicketType = {
  eventId: string;
  productId: string;
};

const SUPPORTED_ZK_MODE_TICKETS: Array<TicketType> = [
  // ETHBerlin - Team
  {
    eventId: "53edb3e7-6733-41e0-a9be-488877c5c572",
    productId: "caa5cb88-19cc-4ee2-bf3d-6d379ce5e611"
  },
  // ETHBerlin - Hacker
  {
    eventId: "53edb3e7-6733-41e0-a9be-488877c5c572",
    productId: "e6a44839-76f5-4a47-8b3b-bb95ea6fc3cc"
  },
  // ETHBerlin - Mentor
  {
    eventId: "53edb3e7-6733-41e0-a9be-488877c5c572",
    productId: "a28bfaa9-2843-48b9-9200-f12dae4a483f"
  },
  {
    // ETHBerlin - Judge
    eventId: "53edb3e7-6733-41e0-a9be-488877c5c572",
    productId: "beb248b4-9ef8-422f-b475-e94234721dc1"
  },
  {
    // ETHBerlin - Student
    eventId: "53edb3e7-6733-41e0-a9be-488877c5c572",
    productId: "beb248b4-9ef8-422f-b475-e94234721dc2"
  },
  // ETHBerlin - Scanner
  {
    eventId: "53edb3e7-6733-41e0-a9be-488877c5c572",
    productId: "ceb248b4-9ef8-422f-b475-e94234721dc2"
  },
  // ETHBerlin - Press
  {
    eventId: "53edb3e7-6733-41e0-a9be-488877c5c572",
    productId: "deb248b4-9ef8-422f-b475-e94234721dc2"
  },
  // ETHBerlin - swagscanner
  {
    eventId: "53edb3e7-6733-41e0-a9be-488877c5c572",
    productId: "eeb248b4-9ef8-422f-b475-e94234721dc2"
  },
  // TEST ETHBerlin event
  {
    eventId: "87360b16-06c4-4dcd-9593-26e8a7450777",
    productId: "ff91ff61-92e6-4dcd-8e85-4467f1070d85"
  },
  {
    eventId: "87360b16-06c4-4dcd-9593-26e8a7450777",
    productId: "3e51a315-18c2-40ad-9512-47ba23d1330f"
  }
];

export function supportsZKMode(ticketType: TicketType): boolean {
  return SUPPORTED_ZK_MODE_TICKETS.some(
    (existingTicket) =>
      existingTicket.eventId === ticketType.eventId &&
      existingTicket.productId === ticketType.productId
  );
}

export function getZKTicketCode(ticketType: TicketType): number {
  for (let i = 0; i < SUPPORTED_ZK_MODE_TICKETS.length; i++) {
    const existingTicket = SUPPORTED_ZK_MODE_TICKETS[i];
    if (
      existingTicket.eventId === ticketType.eventId &&
      existingTicket.productId === ticketType.productId
    ) {
      return i;
    }
  }
  // Return -1 if no match is found
  return -1;
}

export function getTicketType(zkTicketCode: number): TicketType | null {
  if (zkTicketCode < 0 || zkTicketCode >= SUPPORTED_ZK_MODE_TICKETS.length) {
    return null;
  }
  return SUPPORTED_ZK_MODE_TICKETS[zkTicketCode];
}
