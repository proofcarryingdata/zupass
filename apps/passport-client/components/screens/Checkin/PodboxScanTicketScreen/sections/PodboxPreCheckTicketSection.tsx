import { Spacer } from "@pcd/passport-ui";
import { RippleLoader } from "../../../../core/RippleLoader";
import { TicketError } from "../../DevconnectCheckinByIdScreen";
import { usePreCheckTicket } from "../hooks/usePrecheckTicket";
import { CheckInPodboxTicketSection } from "./PodboxCheckInTicketSection";
import { PodboxTicketInfoSection } from "./PodboxTicketInfoSection";

/**
 * Before check-in can be attempted, verify that the user can check the ticket
 * in, and show the results of the check.
 */
export function PodboxPreCheckTicketSection({
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
        <CheckInPodboxTicketSection ticketId={ticketId} eventId={eventId} />
      </>
    );
  }

  return content;
}
