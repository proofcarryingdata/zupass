import { ActionConfigResponseValue, TicketInfo } from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import {
  CardBodyContainer,
  CardHeader,
  CardOutlineExpanded
} from "../../../../shared/PCDCard";
import { Spread, TicketInfoContainer } from "../PodboxScannedTicketScreen";

export function PodboxTicketInfoSection({
  precheck,
  isLoading
}: {
  precheck: ActionConfigResponseValue;
  isLoading: boolean;
}): JSX.Element {
  const ticket: TicketInfo | undefined =
    precheck?.checkinActionInfo?.ticket ??
    precheck?.giveBadgeActionInfo?.ticket ??
    precheck?.shareContactActionInfo?.ticket;

  if (ticket) {
    return (
      <>
        <CardOutlineExpanded disabled={isLoading}>
          <CardHeader>
            <div>{ticket.eventName}</div>
          </CardHeader>
          <CardBodyContainer>
            <TicketInfoContainer>
              <Spread>
                <span>Ticket Type</span> {ticket.ticketName}
              </Spread>
              <Spread>
                <span>Name</span> {ticket.attendeeName}
              </Spread>
              <Spread>
                <span>Email</span> {ticket.attendeeEmail}
              </Spread>

              {!precheck?.checkinActionInfo?.canCheckIn &&
                precheck?.checkinActionInfo?.reason?.name ===
                  "AlreadyCheckedIn" && (
                  <>
                    <Spread>
                      <span>Checked In</span>
                      <span>Yes</span>
                    </Spread>

                    {precheck.checkinActionInfo.reason.checkinTimestamp && (
                      <>
                        <Spread>
                          <span>Check In Date</span>
                          <span>
                            {new Date(
                              precheck.checkinActionInfo.reason.checkinTimestamp
                            ).toDateString()}
                          </span>
                        </Spread>

                        <Spread>
                          <span>Check In Time</span>
                          <span>
                            {
                              new Date(
                                precheck.checkinActionInfo.reason.checkinTimestamp
                              )
                                .toTimeString()
                                .split(" ")[0]
                            }
                          </span>
                        </Spread>
                      </>
                    )}
                  </>
                )}
            </TicketInfoContainer>
          </CardBodyContainer>
        </CardOutlineExpanded>
        <Spacer h={8} />
      </>
    );
  }
}
