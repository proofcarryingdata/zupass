import {
  EdDSATicketPCDTypeName,
  isEdDSATicketPCD
} from "@pcd/eddsa-ticket-pcd";
import { PCD } from "@pcd/pcd-types";
import { isPODTicketPCD } from "@pcd/pod-ticket-pcd";
import uniqWith from "lodash/uniqWith";
import { useMemo } from "react";
import { usePCDs } from "../../../../src/appHooks";
import { TicketPack, TicketType, TicketTypeName } from "../types";
export const isEventTicketPCD = (
  pcd: PCD<unknown, unknown>
): pcd is TicketType => {
  return (
    (isEdDSATicketPCD(pcd) || isPODTicketPCD(pcd)) &&
    !!pcd.claim.ticket.eventStartDate
  );
};

interface DateRange {
  start: Date;
  end?: Date;
}

function serializeTimeRange(range: DateRange): string {
  // Produces something like "2023-01-01T09:00:00.000Z/2023-01-01T17:00:00.000Z"
  const { start, end } = range;
  if (end) {
    return `${start.toISOString()}/${end.toISOString()}`;
  }
  return start.toISOString();
}

function parseTimeRange(serialized: string): DateRange {
  const [startStr, endStr] = serialized.split("/");
  return {
    start: new Date(startStr),
    end: endStr ? new Date(endStr) : undefined
  };
}

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
  })
    .filter((t) => {
      // Filter out tickets that have already passed
      const { eventStartDate } = t.claim.ticket;
      if (!eventStartDate) return false;
      const range = parseTimeRange(eventStartDate);
      if (range.end && range.end.getTime() < Date.now()) return false;
      return true;
    })
    .sort((t1, t2) => {
      // if one of the tickets doesnt have a date, immediately retrun the other one as the bigger one
      if (!t1.claim.ticket.eventStartDate) return 1;
      if (!t2.claim.ticket.eventStartDate) return -1;

      // parse the date
      const range1 = parseTimeRange(t1.claim.ticket.eventStartDate);
      const range2 = parseTimeRange(t2.claim.ticket.eventStartDate);
      const now = Date.now();

      const timeToDate1 = range1.start.getTime() - now;
      const timeToDate2 = range2.start.getTime() - now;

      // 1. both events are upcoming
      // the smaller timeToDate should be first - ordering by nearest upcoming event first.
      if (timeToDate1 >= 0 && timeToDate2 >= 0) {
        return timeToDate1 < timeToDate2 ? -1 : 1;
      }

      // 2. event1 is upcoming event, event2 has passed
      // one of the timeToDates is positive(upcoming) - positive should be ordered first
      // 3. both events have passed
      // both timeToDates are negative - larger means closer to the current time.
      return timeToDate1 > timeToDate2 ? -1 : 1;
    });

  //  This hook is building "ticket packs"
  //  ticket pack - main ticket and all its ticket addons, under the same event and attendee
  return useMemo(() => {
    const eventsMap = new Map<string, TicketPack[]>();
    // const eventMap: [string, TicketPack[]][] = [];
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
        (pack) =>
          pack.eventTicket.claim.ticket.ticketId ===
          ticket.claim.ticket.parentTicketId
      );
      if (!pack) continue;
      pack.addOns.push(ticket);
    }

    return Array.from(eventsMap.entries());
  }, [uniqTickets]);
};
