import { GenericIssuancePreCheckResponseValue } from "@pcd/passport-interface";
import {
  CardBodyContainer,
  CardHeader,
  CardOutlineExpanded
} from "../../../shared/PCDCard";
import { CheckInSection } from "./CheckinSection";
import { Spread, TicketInfoContainer } from "./GenericIssuanceCheckIn";

/**
 * Ticket can be checked in. Show ticket info, and the check-in form.
 */
export function GenericIssuanceUserReadyForCheckin({
  ticketData,
  ticketId,
  eventId
}: {
  ticketData: Extract<
    GenericIssuancePreCheckResponseValue,
    { canCheckIn: true }
  >;
  ticketId: string;
  eventId: string;
}): JSX.Element {
  return (
    <>
      <TicketInfoSection ticketData={ticketData} />
      <CheckInSection ticketId={ticketId} eventId={eventId} />
    </>
  );
}

function TicketInfoSection({
  ticketData
}: {
  ticketData: Extract<
    GenericIssuancePreCheckResponseValue,
    { canCheckIn: true }
  >;
}): JSX.Element {
  return (
    <CardOutlineExpanded>
      <CardHeader>
        <div>{ticketData.eventName}</div>
      </CardHeader>
      <CardBodyContainer>
        <TicketInfoContainer>
          <Spread>
            <span>Ticket Type</span> {ticketData.ticketName}
          </Spread>
          <Spread>
            <span>Name</span> {ticketData.attendeeName}
          </Spread>
          <Spread>
            <span>Email</span> {ticketData.attendeeEmail}
          </Spread>
        </TicketInfoContainer>
      </CardBodyContainer>
    </CardOutlineExpanded>
  );
}
