import { PodboxActionPreCheckResult } from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import { Dispatch, SetStateAction } from "react";
import styled from "styled-components";
import { loadUsingLaserScanner } from "../../../../../src/localstorage";
import { Home, ScanAnotherTicket } from "../PodboxScannedTicketScreen";
import { PodboxTicketInfoSection } from "./PodboxTicketInfoSection";
import { PodboxTicketActionErrorSection } from "./actions/PodboxTicketErrors";
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

  const shouldShowDivider =
    (precheck?.value?.giveBadgeActionInfo?.permissioned ||
      precheck?.value?.getContactActionInfo?.permissioned) &&
    precheck?.value?.checkinActionInfo?.permissioned;

  const divider = shouldShowDivider ? (
    <div>
      <Spacer h={16} />
      <hr />
      <Spacer h={16} />
    </div>
  ) : null;

  if (precheck.success === false) {
    return (
      <>
        <Spacer h={32} />
        <TopRow>
          {!usingLaserScanner && <Home disabled={isLoading} />}
          <ScanAnotherTicket disabled={isLoading} />
        </TopRow>
        <Spacer h={16} />
        <PodboxTicketActionErrorSection error={{ name: "ServerError" }} />
      </>
    );
  }

  if (
    !precheck.value?.checkinActionInfo?.permissioned &&
    !precheck.value?.getContactActionInfo?.permissioned &&
    !precheck.value?.giveBadgeActionInfo?.permissioned
  ) {
    return (
      <>
        <Spacer h={32} />
        <TopRow>
          {!usingLaserScanner && <Home disabled={isLoading} />}
          <ScanAnotherTicket disabled={isLoading} />
        </TopRow>
        <Spacer h={16} />
        <PodboxTicketActionErrorSection
          error={{ name: "NoActionsAvailable" }}
        />
      </>
    );
  }

  return (
    <>
      <Spacer h={32} />

      <TopRow>
        {!usingLaserScanner && <Home disabled={isLoading} />}
        <ScanAnotherTicket disabled={isLoading} />
      </TopRow>

      <Spacer h={16} />

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

      {divider}

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
