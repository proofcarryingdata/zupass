import { ManualTicket } from "@pcd/passport-interface";
import { LemonadeAtom } from "./LemonadePipeline";
import { PretixAtom } from "./PretixPipeline";

// @todo use the interface defined on the food voucher branch
export interface MemberCriteria {
  eventId: string;
  productId: string;
}

export function ticketMatchesCriteria(
  t: LemonadeAtom | PretixAtom | ManualTicket,
  criterias: MemberCriteria[]
): boolean {
  return !!criterias.find((c) => {
    if (t.eventId !== c.eventId) {
      return false;
    }
    if (c.productId && c.productId !== t.productId) {
      return false;
    }
    return true;
  });
}
