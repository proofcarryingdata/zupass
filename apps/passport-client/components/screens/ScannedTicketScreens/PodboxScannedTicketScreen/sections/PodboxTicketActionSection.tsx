import { PodboxActionPreCheckResult } from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import { Dispatch, SetStateAction } from "react";
import styled from "styled-components";
import { loadUsingLaserScanner } from "../../../../../src/localstorage";
import { TicketError } from "../../DevconnectCheckinByIdScreen";
import { Home, ScanAnotherTicket } from "../PodboxScannedTicketScreen";
import { PodboxTicketInfoSection } from "./PodboxTicketInfoSection";
import { CheckInActionSection } from "./actions/checkin/CheckInActionSection";
import { GiveBadgeActionSection } from "./actions/giveBadge/GiveBadgeActionSection";
import { ShareContactActionSection } from "./actions/shareContact/ShareContactActionSection";

/**
 * - checks whether this ticket is valid and what the Current Zupass
 *   can do with the ticket.
 *
 * - uses this information to render the appropriate sections.
 */
export function PodboxTicketActionSection({
  ticketId,
  eventId,
  isLoading,
  setIsLoading,
  precheck
}: {
  ticketId: string;
  eventId: string;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  precheck: PodboxActionPreCheckResult;
}): JSX.Element {
  const usingLaserScanner = loadUsingLaserScanner();

  if (precheck.success === false) {
    return <TicketError error={{ name: "ServerError" }} />;
  }

  return (
    <>
      <Spacer h={32} />

      <TopRow>
        {!usingLaserScanner && <Home disabled={isLoading} />}
        <ScanAnotherTicket disabled={isLoading} />
      </TopRow>
      <Spacer h={8} />

      <PodboxTicketInfoSection
        precheck={precheck.value}
        isLoading={isLoading}
      />

      <CheckInActionSection
        setIsLoading={setIsLoading}
        isLoading={isLoading}
        precheck={precheck}
        ticketId={ticketId}
        eventId={eventId}
      />

      <ShareContactActionSection
        setIsLoading={setIsLoading}
        isLoading={isLoading}
        precheck={precheck}
        ticketId={ticketId}
        eventId={eventId}
      />

      <GiveBadgeActionSection
        setIsLoading={setIsLoading}
        isLoading={isLoading}
        precheck={precheck}
        ticketId={ticketId}
        eventId={eventId}
      />
    </>
  );
}

const TopRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  gap: 8px;
`;
