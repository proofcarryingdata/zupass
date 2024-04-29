import { ActionConfigResponseValue, TicketInfo } from "@pcd/passport-interface";
import {
  FlattenSimpleInterpolation,
  Spacer,
  css,
  styled
} from "@pcd/passport-ui";
import { H4, TextCenter } from "../../../../core";
import { icons } from "../../../../icons";
import {
  CardBodyContainer,
  CardHeader,
  CardOutlineExpanded
} from "../../../../shared/PCDCard";
import { Spread, TicketInfoContainer } from "../PodboxScannedTicketScreen";

const RedactedText = styled.div<{ redacted: boolean }>`
  ${({ redacted }): FlattenSimpleInterpolation =>
    redacted
      ? css`
          color: transparent;
          &:before {
            border-radius: 4px;
            background-color: var(--bg-dark-primary);
            color: var(--bg-dark-primary);
            content: "REDACTED";
            color: white;
            font-weight: bold;
            min-width: 100%;
            text-align: center;
            position: absolute;
            left: 0;
          }
        `
      : css``}

  margin-bottom: 4px;
  padding: 2px;
  width: 140px;
  position: relative;
  text-align: center;
  transition-property: color, background-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  /* Same duration as the toggle slide */
  transition-duration: 300ms;
`;

// const VerifyLine = styled.div`
//   text-transform: capitalize;
//   margin: 12px 0px;
// `;

// const NameLine = styled.p`
//   margin: 2px 0px;
// `;

// Alterate bottom section
// function VerifiedAndKnownTicket({
//   publicKeyName,
//   ticketName,
//   eventName
// }: {
//   publicKeyName: string;
//   ticketName: string | undefined;
//   eventName: string;
// }): JSX.Element {
//   return (
//     <CardContainerExpanded>
//       <CardOutlineExpanded>
//         <CardHeader col="var(--accent-lite)">
//           <VerifyLine>Verified {eventName} Ticket</VerifyLine>
//           <VerifyLine>
//             {ticketName?.split("\n").map((line) => {
//               return <NameLine>{line}</NameLine>;
//             })}
//           </VerifyLine>
//           <VerifyLine>SIGNED BY: {publicKeyName}</VerifyLine>
//         </CardHeader>
//       </CardOutlineExpanded>
//     </CardContainerExpanded>
//   );
// }

export function PodboxZKModeTicketInfoSection({
  precheck,
  isLoading
}: {
  precheck: ActionConfigResponseValue;
  isLoading: boolean;
}): JSX.Element | undefined {
  const ticket: TicketInfo | undefined =
    precheck?.checkinActionInfo?.ticket ??
    precheck?.giveBadgeActionInfo?.ticket ??
    precheck?.getContactActionInfo?.ticket;

  if (ticket) {
    return (
      <>
        <TextCenter>
          <Spacer h={24} />
          <img
            style={{ display: "block", margin: "0 auto" }}
            draggable="false"
            width="90"
            height="90"
            src={icons.verifyValid}
          />
          <Spacer h={24} />
          <H4 col="var(--accent-dark)">PROOF VERIFIED.</H4>
          <Spacer h={24} />
        </TextCenter>
        {/* <VerifiedAndKnownTicket
          publicKeyName="Department of Decentralization"
          ticketName=""
          eventName="ETHBerlin"
        /> */}
        <CardOutlineExpanded disabled={isLoading}>
          <CardHeader>
            <div style={{ textTransform: "uppercase" }}>{ticket.eventName}</div>
          </CardHeader>
          <CardBodyContainer>
            <TicketInfoContainer>
              <Spread style={{ height: 32 }}>
                <span>Ticket Type</span> {ticket.ticketName}
              </Spread>
              <Spread>
                <span>Name</span>
                <RedactedText redacted>x</RedactedText>
              </Spread>
              <Spread>
                <span>Email</span> <RedactedText redacted>x</RedactedText>
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
