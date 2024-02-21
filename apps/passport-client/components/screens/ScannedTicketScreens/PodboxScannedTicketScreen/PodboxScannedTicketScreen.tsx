import { Spacer } from "@pcd/passport-ui";
import { useCallback, useEffect } from "react";
import styled from "styled-components";
import {
  useLaserScannerKeystrokeInput,
  useQuery,
  useSelf,
  useUserForcedToLogout
} from "../../../../src/appHooks";
import {
  clearAllPendingRequests,
  pendingGenericIssuanceCheckinRequestKey,
  setPendingGenericIssuanceCheckinRequest
} from "../../../../src/sessionStorage";
import { Button, H5 } from "../../../core";
import { RippleLoader } from "../../../core/RippleLoader";
import { AppContainer } from "../../../shared/AppContainer";
import { useTicketDataFromQuery } from "./hooks/useTicketDataFromQuery";
import { PodboxTicketActionSection } from "./sections/PodboxTicketActionSection";

/**
 * Shows the check-in screen for a generic issuance ticket.
 *
 * On load, this parses ticket data from the URL. This can either be a base64-
 * encoded JSON string with a ticket ID and event ID, or a serialized
 * ZKEdDSAEventTicketPCD, which also contains a ticket ID and event ID.
 *
 * If these are found, we load a "PreCheckTicket" stage. This sends a
 * credential to the back-end, which will confirm whether the current user can
 * check the ticket in. If they can do so, some ticket metadata is returned.
 *
 * This could fail for several reasons:
 * - Either ticket ID or event ID not recognized
 * - User does not have permission to check the ticket in
 * - Ticket is already checked in, or a pending check-in request is underway
 *
 * If this pre-check fails, the user is shown an error message.
 * If it succeeds, the check-in form is shown, along with the ticket metadata.
 */
export function PodboxScannedTicketScreen(): JSX.Element {
  useLaserScannerKeystrokeInput();
  const {
    loading: parsingTicketData,
    ticketId,
    eventId
  } = useTicketDataFromQuery();

  const self = useSelf();
  const userForcedToLogout = useUserForcedToLogout();
  const query = useQuery();

  useEffect(() => {
    if (self == null || userForcedToLogout) {
      clearAllPendingRequests();
      const stringifiedRequest = JSON.stringify(
        query.get("id") ? { id: query.get("id") } : { pcd: query.get("pcd") }
      );
      setPendingGenericIssuanceCheckinRequest(stringifiedRequest);
      if (self == null) {
        window.location.href = `/#/login?redirectedFromAction=true&${pendingGenericIssuanceCheckinRequestKey}=${encodeURIComponent(
          stringifiedRequest
        )}`;
      }
    }
  }, [self, userForcedToLogout, query]);

  let content = null;

  if (parsingTicketData) {
    content = (
      <div>
        <Spacer h={32} />
        <RippleLoader />
      </div>
    );
  } else {
    content = (
      <PodboxTicketActionSection ticketId={ticketId} eventId={eventId} />
    );
  }

  return (
    <AppContainer bg={"primary"}>
      <Container>{content}</Container>
    </AppContainer>
  );
}

export function ScanAnotherTicket(): JSX.Element {
  const onClick = useCallback(() => {
    window.location.href = "/#/scan";
  }, []);

  return (
    <Button style="secondary" onClick={onClick}>
      Scan Another Ticket
    </Button>
  );
}

export function Home(): JSX.Element {
  const onClick = useCallback(() => {
    window.location.href = "/#/";
  }, []);

  return (
    <>
      <Spacer h={8} />
      <Button style="secondary" onClick={onClick}>
        Home
      </Button>
    </>
  );
}

export const TicketInfoContainer = styled.div`
  padding: 16px;
`;

export const Container = styled.div`
  margin-top: 64px;
  color: var(--bg-dark-primary);
  width: 400px;
  padding: 0px 32px;
`;

export const CheckinSuccess = styled.span`
  color: green;
  font-size: 1.5em;
`;

export const CheckinSectionContainer = styled.div`
  margin-top: 16px;
`;

export const Spread = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const ErrorContainer = styled.div`
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--danger);
  border-radius: 12px;
  background: white;
`;

export const ErrorTitle = styled(H5)`
  color: var(--danger);
`;

export const StatusContainer = styled.div`
  padding: 64px 16px;
  background-color: #dfffc6;
  margin-top: 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
`;
