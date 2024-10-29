import {
  EdDSATicketPCDTypeName,
  isEdDSATicketPCD
} from "@pcd/eddsa-ticket-pcd";
import { isPODTicketPCD } from "@pcd/pod-ticket-pcd";
import { TicketPack, TicketType, TicketTypeName } from "../types";
import { usePCDs } from "../../../../src/appHooks";
import uniqWith from "lodash/uniqWith";
import { PCD } from "@pcd/pcd-types";
import { useMemo } from "react";
export const isEventTicketPCD = (
  pcd: PCD<unknown, unknown>
): pcd is TicketType => {
  return (
    (isEdDSATicketPCD(pcd) || isPODTicketPCD(pcd)) &&
    !!pcd.claim.ticket.eventStartDate
  );
};
export const useTickets = (): Array<[string, TicketPack[]]> => {
  const allPCDs = usePCDs();
  const tickets = allPCDs.filter(isEventTicketPCD).reverse();
  //fitering out overlapping eddsa tickets
  const uniqTickets = uniqWith(tickets, (t1, t2) => {
    return (
      t1.claim.ticket.eventId === t2.claim.ticket.eventId &&
      t1.claim.ticket.attendeeEmail === t2.claim.ticket.attendeeEmail &&
      t1.type === EdDSATicketPCDTypeName
    );
  }).sort((t1, t2) => {
    // if one of the tickets doesnt have a date, immidiatly retrun the other one as the bigger one
    if (!t1.claim.ticket.eventStartDate) return -1;
    if (!t2.claim.ticket.eventStartDate) return 1;

    // parse the date
    const date1 = Date.parse(t1.claim.ticket.eventStartDate);
    const date2 = Date.parse(t2.claim.ticket.eventStartDate);
    const now = Date.now();

    const timeToDate1 = date1 - now;
    const timeToDate2 = date2 - now;
    // if one of the dates passed its due date, immidately return the other one
    if (timeToDate1 < 0) return -1;
    if (timeToDate2 < 0) return 1;

    // return which date is closer to the current time
    return timeToDate1 - timeToDate2;
  });

  //  This hook is building "ticket packs"
  //  ticket pack - main ticket and all its ticket addons, under the same event and attendee
  return useMemo(() => {
    const eventsMap = new Map<string, TicketPack[]>();
    // creating the initial ticket packs for events - only main event ticket
    for (const ticket of uniqTickets) {
      if (ticket.claim.ticket.isAddOn) continue;
      let ticketPacks = eventsMap.get(ticket.claim.ticket.eventId);
      if (!ticketPacks) {
        ticketPacks = [];
        eventsMap.set(ticket.claim.ticket.eventId, ticketPacks);
      }
      ticketPacks.push({
        eventTicket: ticket,
        eventName: ticket.claim.ticket.eventName,
        addOns: [],
        attendeeEmail: ticket.claim.ticket.attendeeEmail,
        packType: ticket.type as TicketTypeName
      });
    }
    // adding the addons to their respective ticket pack
    for (const ticket of uniqTickets) {
      if (!ticket.claim.ticket.isAddOn) continue;
      const ticketPacks = eventsMap.get(ticket.claim.ticket.eventId);
      if (!ticketPacks) continue;
      const pack = ticketPacks.find(
        (pack) => pack.attendeeEmail === ticket.claim.ticket.attendeeEmail
      );
      if (!pack) continue;
      pack.addOns.push(ticket);
    }
    return Array.from(eventsMap.entries());
  }, [uniqTickets]);
};
