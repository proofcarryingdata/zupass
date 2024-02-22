import { PodboxPrecheckResultValue } from "@pcd/passport-interface";
import {
  CardBodyContainer,
  CardHeader,
  CardOutlineExpanded
} from "../../../../shared/PCDCard";
import { Spread, TicketInfoContainer } from "../PodboxScanTicketScreen";

export function PodboxTicketInfoSection({
  ticketData
}: {
  ticketData: Extract<PodboxPrecheckResultValue, { canCheckIn: true }>;
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
