import { Spacer } from "@pcd/passport-ui";
import { RippleLoader } from "../../../../core/RippleLoader";
import { TicketError } from "../../DevconnectCheckinByIdScreen";
import { usePreCheckTicket } from "../hooks/usePrecheckTicket";
import { PodboxTicketInfoSection } from "./PodboxTicketInfoSection";
import { PodboxCheckInActionSection } from "./actions/checkin/PodboxCheckInActionSection";

/**
 * - checks whether this ticket is valid and what the Current Zupass
 *   can do with the ticket.
 *
 * - uses this information to render the appropriate sections.
 */
export function PodboxTicketActionSection({
  ticketId,
  eventId
}: {
  ticketId: string;
  eventId: string;
}): JSX.Element {
  const { loading: checkingTicket, result: checkTicketByIdResult } =
    usePreCheckTicket(ticketId, eventId);

  let content = null;

  if (checkingTicket) {
    content = (
      <div>
        <Spacer h={32} />
        <RippleLoader />
      </div>
    );
  } else if (checkTicketByIdResult.success === false) {
    content = <TicketError error={{ name: "ServerError" }} />;
  } else if (checkTicketByIdResult.value.canCheckIn === false) {
    content = <TicketError error={checkTicketByIdResult.value.error} />;
  } else {
    content = (
      <>
        <PodboxTicketInfoSection ticketData={checkTicketByIdResult.value} />
        <PodboxCheckInActionSection ticketId={ticketId} eventId={eventId} />
      </>
    );
  }

  return content;
}
