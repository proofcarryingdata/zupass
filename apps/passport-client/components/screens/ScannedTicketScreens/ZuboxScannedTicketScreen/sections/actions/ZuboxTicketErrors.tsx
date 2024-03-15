import { ZuboxTicketActionError } from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import {
  ErrorContainer,
  ErrorTitle,
  Spread
} from "../../ZuboxScannedTicketScreen";

export function ZuboxTicketActionErrorSection({
  error
}: {
  error: ZuboxTicketActionError;
}): JSX.Element {
  let errorContent = null;

  switch (error.name) {
    case "NoActionsAvailable":
      errorContent = (
        <>
          <ErrorTitle>No Actions Available</ErrorTitle>
          <Spacer h={8} />
          <div>You're not permissioned to do anything with this ticket.</div>
        </>
      );
      break;
    case "AlreadyCheckedIn":
      errorContent = (
        <>
          <ErrorTitle>Already checked in</ErrorTitle>
          <Spacer h={8} />
          <Spread>
            <span>Checked in at</span>
            <span>{new Date(error.checkinTimestamp).toLocaleString()}</span>
          </Spread>
          <Spread>
            <span>Checked in by</span>
            <span>{error.checker}</span>
          </Spread>
        </>
      );
      break;
    case "InvalidSignature":
      errorContent = (
        <>
          <ErrorTitle>Invalid Ticket Signature</ErrorTitle>
          <Spacer h={8} />
          <span>This ticket was not issued by Zupass.</span>
        </>
      );
      break;
    case "InvalidTicket":
      errorContent = (
        <>
          <ErrorTitle>Invalid ticket</ErrorTitle>
          <Spacer h={8} />
          <span>This ticket is invalid.</span>
        </>
      );
      break;
    case "NotSuperuser":
      errorContent = (
        <>
          <ErrorTitle>Not authorized</ErrorTitle>
          <Spacer h={8} />
          <div>{error.detailedMessage}</div>
        </>
      );
      break;
    case "ServerError":
      errorContent = (
        <>
          <ErrorTitle>Network Error</ErrorTitle>
          <Spacer h={8} />
          <span>please try again</span>
        </>
      );
      break;
    case "TicketRevoked":
      errorContent = (
        <>
          <ErrorTitle>This ticket was revoked</ErrorTitle>
          <Spacer h={8} />
          <Spread>
            <span>Revoked at</span>
            <span>{error.revokedTimestamp}</span>
          </Spread>
        </>
      );
      break;
  }

  return <ErrorContainer>{errorContent}</ErrorContainer>;
}
