import { Spacer } from "@pcd/passport-ui";
import { CenterColumn, H1, TextCenter } from "../../core";
import { AppContainer } from "../../shared/AppContainer";
import { ScanAnotherTicket } from "./PodboxScannedTicketScreen/PodboxScannedTicketScreen";

export function ExpiredTicketScreen(): JSX.Element {
  return (
    <AppContainer bg="gray">
      <CenterColumn w={290}>
        <TextCenter>
          <Spacer h={64} />
          <H1>Expired ticket</H1>
          <Spacer h={24} />
          <p>
            Check-in for this event has expired, and so the ticket can no longer
            be scanned.
          </p>
          <Spacer h={24} />
          <ScanAnotherTicket />
          <Spacer h={24} />
        </TextCenter>
      </CenterColumn>
    </AppContainer>
  );
}
