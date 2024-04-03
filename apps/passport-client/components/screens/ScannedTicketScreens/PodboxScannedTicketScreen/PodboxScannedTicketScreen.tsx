import { Spacer } from "@pcd/passport-ui";
import { useCallback } from "react";
import styled, { FlattenSimpleInterpolation, css } from "styled-components";
import {
  useLaserScannerKeystrokeInput,
  useLoginIfNoSelf,
  useQuery
} from "../../../../src/appHooks";
import { pendingRequestKeys } from "../../../../src/sessionStorage";
import { Button, CenterColumn, H5 } from "../../../core";
import { RippleLoader } from "../../../core/RippleLoader";
import { AppContainer } from "../../../shared/AppContainer";
import { CardBodyContainer } from "../../../shared/PCDCard";
import { usePreCheckTicket } from "./hooks/usePrecheckTicket";
import {
  TicketIdState,
  useTicketDataFromQuery
} from "./hooks/useTicketDataFromQuery";
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
  const query = useQuery();

  useLoginIfNoSelf(
    pendingRequestKeys.genericIssuanceCheckin,
    JSON.stringify(
      query?.get("id") ? { id: query?.get("id") } : { pcd: query?.get("pcd") }
    )
  );

  const ticketIds = useTicketDataFromQuery();

  if (ticketIds.state === TicketIdState.Loading) {
    return (
      <AppContainer bg={"primary"}>
        <CenterColumn w={400}>
          <Spacer h={32} />
          <RippleLoader />
        </CenterColumn>
      </AppContainer>
    );
  }

  if (ticketIds.state === TicketIdState.Success) {
    return (
      <PrecheckTicket
        ticketId={ticketIds.ticketId}
        eventId={ticketIds.eventId}
      />
    );
  }

  return (
    <AppContainer bg={"primary"}>
      <CenterColumn w={400}>
        <Spacer h={32} />
        <div>Could not scan ticket.</div>
        <Spacer h={32} />
        <ScanAnotherTicket />
      </CenterColumn>
    </AppContainer>
  );
}

function PrecheckTicket({
  ticketId,
  eventId
}: {
  ticketId: string;
  eventId: string;
}): JSX.Element {
  const { loading, result } = usePreCheckTicket(ticketId, eventId);

  if (loading) {
    return (
      <AppContainer bg={"primary"}>
        <CenterColumn w={400}>
          <Spacer h={32} />
          <RippleLoader />
        </CenterColumn>
      </AppContainer>
    );
  }

  return (
    <AppContainer bg={"primary"}>
      <CenterColumn w={400}>
        <PodboxTicketActionSection
          precheck={result}
          ticketId={ticketId}
          eventId={eventId}
        />
      </CenterColumn>
    </AppContainer>
  );
}

export function ScanAnotherTicket({
  disabled
}: {
  disabled?: boolean;
}): JSX.Element {
  const onClick = useCallback(() => {
    window.location.href = "/#/scan";
  }, []);

  return (
    <Button style="outline-lite" onClick={onClick} disabled={disabled}>
      Scan Another
    </Button>
  );
}

export function Home({ disabled }: { disabled?: boolean }): JSX.Element {
  const onClick = useCallback(() => {
    window.location.href = "/#/";
  }, []);

  return (
    <>
      <Button style="outline-lite" onClick={onClick} disabled={disabled}>
        Home
      </Button>
    </>
  );
}

export function FakeBack({ disabled }: { disabled?: boolean }): JSX.Element {
  const onClick = useCallback(() => {
    window.location.href = "/#/?folder=Edge%2520City&tab=experiences";
  }, []);

  return (
    <>
      <Button style="outline-lite" onClick={onClick} disabled={disabled}>
        Back
      </Button>
    </>
  );
}

export function Back({ disabled }: { disabled?: boolean }): JSX.Element {
  const onClick = useCallback(() => {
    window.history.back();
  }, []);

  return (
    <>
      <Button style="outline-lite" onClick={onClick} disabled={disabled}>
        Back
      </Button>
    </>
  );
}

export const TicketInfoContainer = styled.div`
  padding: 16px;
`;

export const Spread = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const ErrorContainer = styled(CardBodyContainer)`
  padding: 16px;
  border: 1px solid var(--danger);
  border-radius: 12px;
`;

export const ErrorTitle = styled(H5)`
  color: var(--danger);
`;

export const StatusContainer = styled.div`
  ${({
    disabled,
    size
  }: {
    disabled?: boolean;
    size?: "small";
  }): FlattenSimpleInterpolation => css`
    padding: 64px 16px;
    background-color: #dfffc6;
    color: #33640d;
    border-radius: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: ${disabled ? "0.5" : "1"};

    ${size === "small"
      ? css`
          padding: 16px 8px;
        `
      : css``}
  `}
`;
