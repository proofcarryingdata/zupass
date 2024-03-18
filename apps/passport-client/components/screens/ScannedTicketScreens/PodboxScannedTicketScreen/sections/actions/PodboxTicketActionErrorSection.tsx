import { PodboxTicketActionError } from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import {
  ErrorContainer,
  ErrorTitle,
  Spread
} from "../../PodboxScannedTicketScreen";

export function PodboxTicketActionErrorSection({
  error
}: {
  error: PodboxTicketActionError;
}): JSX.Element {
  let errorContent = null;

  switch (error.name) {
    case "NoActionsAvailable":
      errorContent = (
        <>
          <ErrorTitle>NoActionsAvailable</ErrorTitle>
          <Spacer h={8} />
          <span>NoActionsAvailable.</span>
        </>
      );
      break;
    case "AlreadyCheckedIn":
      errorContent = null;
      break;
    case "InvalidSignature":
      errorContent = (
        <>
          <ErrorTitle>Invalid Ticket Signature</ErrorTitle>
          <Spacer h={8} />
          <span>This ticket was not issued by Zupass.</span>
          <div>{error.detailedMessage}</div>
        </>
      );
      break;
    case "InvalidTicket":
      errorContent = (
        <>
          <ErrorTitle>Invalid ticket</ErrorTitle>
          <Spacer h={8} />
          <span>This ticket is invalid.</span>
          <div>{error.detailedMessage}</div>
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
          <div>{error.detailedMessage}</div>
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
            <div>{error.detailedMessage}</div>
          </Spread>
        </>
      );
      break;
  }

  if (errorContent) {
    return <ErrorContainer>{errorContent}</ErrorContainer>;
  }
}
