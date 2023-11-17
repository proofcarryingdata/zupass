import { TicketCategory, isEdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import {
  CheckTicketByIdResult,
  KnownTicketGroup,
  requestVerifyTicket,
  requestVerifyTicketById
} from "@pcd/passport-interface";
import { decodeQRPayload } from "@pcd/passport-ui";
import { PCD, SerializedPCD } from "@pcd/pcd-types";
import { isZKEdDSAEventTicketPCD } from "@pcd/zk-eddsa-event-ticket-pcd";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import {
  usePCDCollection,
  useQuery,
  useStateContext
} from "../../src/appHooks";
import { devconnectCheckByIdWithOffline } from "../../src/checkin";
import { CenterColumn, H4, Placeholder, Spacer, TextCenter } from "../core";
import { LinkButton } from "../core/Button";
import { icons } from "../icons";
import { AppContainer } from "../shared/AppContainer";
import { ZuconnectKnownTicketDetails } from "../shared/cards/ZuconnectTicket";
import { ZuzaluKnownTicketDetails } from "../shared/cards/ZuzaluTicket";
import {
  TicketError,
  UserReadyForCheckin
} from "./DevconnectCheckinByIdScreen";

enum VerifyOutcome {
  // We recognize this ticket
  KnownTicketType,
  // If verification failed for any reason
  NotVerified
}

type VerifyResult =
  | {
      outcome: VerifyOutcome.KnownTicketType;
      productId: string;
      group: KnownTicketGroup;
      publicKeyName: string;
      ticketName?: string;
      ticketId: string;
    }
  | {
      outcome: VerifyOutcome.NotVerified;
      // For unverified tickets there is an error message
      message: string;
    };

function isDevconnectTicket(pcd: PCD): boolean {
  if (
    isEdDSATicketPCD(pcd) &&
    pcd.claim.ticket.ticketCategory === TicketCategory.Devconnect
  ) {
    return true;
  } else if (
    isZKEdDSAEventTicketPCD(pcd) &&
    pcd.claim.partialTicket.ticketCategory === TicketCategory.Devconnect
  ) {
    return true;
  } else {
    return false;
  }
}

// Shows whether a ticket can be verified, and whether it is a known ticket
// about which we can show extra information. "Known tickets" are tickets such
// as Zuzalu or Zuconnect tickets.
// Unknown tickets are displayed with a warning that we cannot attest to the
// truth of the claim being made, e.g. that a ticket is a Zuzalu ticket,
// since the presented ticket does not match any known pattern of event ID,
// product ID and signing key.
export function SecondPartyTicketVerifyScreen() {
  const query = useQuery();
  const encodedQRPayload = query.get("pcd");
  const id = query.get("id");

  const { pcd, serializedPCD } = useDecodedPayload(encodedQRPayload);

  const [verifyResult, setVerifyResult] = useState<VerifyResult | undefined>();
  const [checkResult, setCheckResult] = useState<
    CheckTicketByIdResult | undefined
  >();

  const stateContext = useStateContext();

  let ticketId = null;
  if (id) {
    ticketId = id;
  } else if (pcd && isEdDSATicketPCD(pcd)) {
    ticketId = pcd.claim.ticket.ticketId;
  } else if (pcd && isZKEdDSAEventTicketPCD(pcd)) {
    ticketId = pcd.claim.partialTicket.ticketId;
  }

  useEffect(() => {
    (async () => {
      if (pcd) {
        const result = await verify(pcd, serializedPCD);
        setVerifyResult(result);
      } else if (id) {
        const payload = JSON.parse(Buffer.from(id, "base64").toString());
        const result = await verifyById(payload.ticketId, payload.timestamp);
        setVerifyResult(result);
      }
    })();
  }, [setVerifyResult, id, pcd, serializedPCD]);

  useEffect(() => {
    (async () => {
      if (pcd && isZKEdDSAEventTicketPCD(pcd) && isDevconnectTicket(pcd)) {
        const result = await devconnectCheckByIdWithOffline(
          pcd.claim.partialTicket.ticketId,
          stateContext
        );
        setCheckResult(result);
      }
    })();
  }, [pcd, stateContext]);

  const bg = checkResult && checkResult.success === true ? "primary" : "gray";

  let connectionError = false;

  const checkAndVerifyComplete =
    verifyResult !== undefined && (!pcd || checkResult !== undefined);

  let icon = icons.verifyInProgress;

  if (checkAndVerifyComplete) {
    if (verifyResult.outcome === VerifyOutcome.NotVerified) {
      // The "invalid" icon is used for PCDs which are formally valid but
      // unknown
      icon = icons.verifyInvalid;
      if (
        verifyResult.message ===
        "NetworkError when attempting to fetch resource."
      ) {
        connectionError = true;
      }
    } else {
      icon = icons.verifyValid;
    }
  }

  const showCheckin =
    checkAndVerifyComplete &&
    checkResult &&
    (checkResult.success === true || checkResult.error.name !== "NotSuperuser");

  if (!checkAndVerifyComplete) {
    return <WaitingForCheckAndVerify />;
  }

  if (showCheckin) {
    return (
      <AppContainer bg={"primary"}>
        <Container>
          <TextCenter>
            <ZKCheckinNotice>
              As event staff, you can see this check-in information from
              the Pretix API:
            </ZKCheckinNotice>
            {checkResult.success && (
              <UserReadyForCheckin
                ticketData={checkResult.value}
                ticketId={ticketId}
              />
            )}
            {!checkResult.success && <TicketError error={checkResult.error} />}
          </TextCenter>
        </Container>
      </AppContainer>
    );
  }

  if (
    pcd &&
    isZKEdDSAEventTicketPCD(pcd) &&
    isDevconnectTicket(pcd) &&
    verifyResult.outcome === VerifyOutcome.KnownTicketType
  ) {
    return (
      <AppContainer bg={bg}>
        <Spacer h={48} />

        <ZKNoticeContainer>
          <h2>Zero-knowledge ticket</h2>
          <p>
            You can't check this ticket in, as you're not event staff for the
            event.
          </p>
          <p>However, you can see the following ticket information:</p>
          <dl>
            {pcd.claim.partialTicket.ticketId && (
              <>
                <dt>Ticket ID</dt>
                <dd>{pcd.claim.partialTicket.ticketId}</dd>
              </>
            )}
            {pcd.claim.partialTicket.eventId && (
              <>
                <dt>Event ID</dt>
                <dd>{pcd.claim.partialTicket.eventId}</dd>
              </>
            )}
            {pcd.claim.partialTicket.productId && (
              <>
                <dt>Product ID</dt>
                <dd>{pcd.claim.partialTicket.productId}</dd>
              </>
            )}
            {verifyResult.publicKeyName && (
              <>
                <dt>Signed by</dt>
                <dd>{verifyResult.publicKeyName}</dd>
              </>
            )}
          </dl>
          <p>
            The following information is <strong>NOT</strong> revealed:
          </p>
          <dl>
            <dt>Ticket-holder email</dt>
            <dd>
              <strong>HIDDEN</strong>
            </dd>
            <dt>Ticket-holder name</dt>
            <dd>
              <strong>HIDDEN</strong>
            </dd>
          </dl>
        </ZKNoticeContainer>
      </AppContainer>
    );
  }

  return (
    <AppContainer bg={bg}>
      <Spacer h={48} />

      <TextCenter>
        <img draggable="false" width="90" height="90" src={icon} />
        <Spacer h={24} />
        {verifyResult.outcome === VerifyOutcome.KnownTicketType && (
          <>
            <H4 col="var(--accent-dark)">PROOF VERIFIED.</H4>
          </>
        )}

        {verifyResult.outcome === VerifyOutcome.NotVerified && (
          <>
            {!connectionError && <H4>PROOF UNKNOWN.</H4>}
            {connectionError && <H4>OFFLINE.</H4>}
          </>
        )}
      </TextCenter>
      <Spacer h={48} />
      <Placeholder minH={160}>
        {verifyResult.outcome === VerifyOutcome.NotVerified && (
          <TextCenter>{verifyResult.message}</TextCenter>
        )}
        {verifyResult.outcome === VerifyOutcome.KnownTicketType && (
          <VerifiedAndKnownTicket
            productId={verifyResult.productId}
            category={verifyResult.group}
            publicKeyName={verifyResult.publicKeyName}
            ticketName={verifyResult.ticketName}
          />
        )}
      </Placeholder>
      <Spacer h={64} />
      <CenterColumn w={280}>
        <LinkButton to="/scan">Verify another</LinkButton>
        <Spacer h={8} />
        <LinkButton to="/">Back to Zupass</LinkButton>
        <Spacer h={24} />
      </CenterColumn>
    </AppContainer>
  );
}

function WaitingForCheckAndVerify() {
  return (
    <AppContainer bg={"gray"}>
      <Spacer h={48} />

      <TextCenter>
        <img
          draggable="false"
          width="90"
          height="90"
          src={icons.verifyInProgress}
        />
        <Spacer h={24} />
        <H4>VERIFYING PROOF...</H4>
      </TextCenter>
    </AppContainer>
  );
}

/**
 * If the ticket is verified and is a known Zuzalu '23 or Zuconnect '23
 * ticket, display a ticket-specific message to the user.
 */
function VerifiedAndKnownTicket({
  productId,
  publicKeyName,
  category,
  ticketName
}: {
  productId: string;
  publicKeyName: string;
  category: KnownTicketGroup;
  ticketName: string | undefined;
}) {
  // Devconnect tickets with the "simple" QR code have a separate "check-in"
  // flow and never come here.
  if (category === KnownTicketGroup.Zuzalu23) {
    return <ZuzaluKnownTicketDetails publicKeyName={publicKeyName} />;
  } else if (category === KnownTicketGroup.Zuconnect23) {
    return (
      <ZuconnectKnownTicketDetails
        productId={productId}
        publicKeyName={publicKeyName}
        ticketName={ticketName}
      />
    );
  }
}

function useDecodedPayload(encodedQRPayload: string) {
  const [pcd, setPcd] = useState<PCD>(null);
  const [serializedPCD, setSerializedPCD] = useState<SerializedPCD>(null);
  const pcds = usePCDCollection();

  useEffect(() => {
    (async () => {
      try {
        if (encodedQRPayload) {
          // decodedPCD is a JSON.stringify'd {@link SerializedPCD}
          const decodedPayload = decodeQRPayload(encodedQRPayload);
          const serializedPCD: SerializedPCD = JSON.parse(decodedPayload);
          const pcd = await pcds.deserialize(serializedPCD);
          setPcd(pcd);
          setSerializedPCD(serializedPCD);
        }
      } catch (e) {
        console.log("Could not deserialize PCD:", e);
      }
    })();
  }, [encodedQRPayload, pcds]);

  return { pcd, serializedPCD };
}

/**
 * Deserialize the PCD, and send it to the server for verification.
 * This checks both that the PCD has a valid structure, with a proof that
 * matches the claim, and whether or not the ticket matches a known group
 * of tickets, e.g. Zuzalu or Zuconnect tickets.
 *
 * Returns a {@link VerifyResult}
 */
async function verify(
  pcd: PCD,
  serializedPCD: SerializedPCD
): Promise<VerifyResult> {
  const result = await requestVerifyTicket(appConfig.zupassServer, {
    pcd: JSON.stringify(serializedPCD)
  });

  if (result.success && result.value.verified) {
    // This check is mostly for the benefit of the TypeScript type-checker
    // If requestVerifyTicket() succeeded then the PCD type must be
    // EdDSATicketPCD or ZKEdDSAEventTicketPCD
    if (isEdDSATicketPCD(pcd) || isZKEdDSAEventTicketPCD(pcd)) {
      if (result.value.verified) {
        return {
          outcome: VerifyOutcome.KnownTicketType,
          productId: isEdDSATicketPCD(pcd)
            ? pcd.claim.ticket.productId
            : pcd.claim.partialTicket.productId,
          publicKeyName: result.value.publicKeyName,
          group: result.value.group,
          ticketId: isEdDSATicketPCD(pcd)
            ? pcd.claim.ticket.ticketId
            : pcd.claim.partialTicket.ticketId
        };
      }
    }
  }

  return {
    outcome: VerifyOutcome.NotVerified,
    message:
      (result.success && result.value.verified === false
        ? result.value.message
        : null) ?? "Could not verify PCD"
  };
}

async function verifyById(
  ticketId: string,
  timestamp: string
): Promise<VerifyResult> {
  const result = await requestVerifyTicketById(appConfig.zupassServer, {
    ticketId,
    timestamp
  });

  if (result.success && result.value.verified) {
    return {
      outcome: VerifyOutcome.KnownTicketType,
      productId: result.value.productId,
      publicKeyName: result.value.publicKeyName,
      group: result.value.group,
      ticketName: result.value.ticketName,
      ticketId
    };
  }

  return {
    outcome: VerifyOutcome.NotVerified,
    message:
      (result.success && result.value.verified === false
        ? result.value.message
        : null) ?? "Could not verify ticket"
  };
}

const Container = styled.div`
  margin-top: 64px;
  color: var(--bg-dark-primary);
  width: 400px;
  padding: 0px 32px;
`;

const ZKNoticeContainer = styled.div`
  padding: 16px;
  min-width: 400px;
  margin-top: 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  border: 2px solid var(--accent-dark);
  color: var(--accent-dark);

  h2 {
    font-family: monospace;
    font-weight: bold;
    text-transform: uppercase;
    margin: 16px 0px;
    text-align: center;
  }

  p {
    margin: 8px 0px;

    em {
      display: inline-block;
      border-radius: 4px;
      background-color: var(--bg-dark);
      color: var(--white);
      font-weight: bold;
      font-style: normal;
    }
  }

  dt {
    display: inline-block;
    width: 30%;
    vertical-align: top;
    margin-bottom: 8px;
  }

  dd {
    display: inline-block;
    width: 70%;
    color: var(--accent-lite);
    margin-bottom: 8px;
  }
`;

const ZKCheckinNotice = styled.div`
  margin-bottom: 16px;
  color: var(--accent-dark);
`;
