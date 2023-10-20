import { isEdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import { KnownTicketGroup } from "@pcd/passport-interface";
import { decodeQRPayload } from "@pcd/passport-ui";
import { isZKEdDSAEventTicketPCD } from "@pcd/zk-eddsa-event-ticket-pcd";
import { useEffect, useState } from "react";
import {
  usePCDCollection,
  useQuery,
  useStateContext
} from "../../src/appHooks";
import {
  secondPartyCheckByIdWithOffline,
  secondPartyCheckByPCDWithOffline
} from "../../src/checkin";
import { StateContextValue } from "../../src/dispatch";
import { CenterColumn, H4, Placeholder, Spacer, TextCenter } from "../core";
import { LinkButton } from "../core/Button";
import { icons } from "../icons";
import { AppContainer } from "../shared/AppContainer";
import { ZuconnectKnownTicketDetails } from "../shared/cards/ZuconnectTicket";
import { ZuzaluKnownTicketDetails } from "../shared/cards/ZuzaluTicket";

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
    }
  | {
      outcome: VerifyOutcome.NotVerified;
      // For unverified tickets there is an error message
      message: string;
    };

// Shows whether a ticket can be verified, and whether it is a known ticket
// about which we can show extra information. "Known tickets" are tickets such
// as Zuzalu or Zuconnect tickets.
// Unknown tickets are displayed with a warning that we cannot attest to the
// truth of the claim being made, e.g. that a ticket is a Zuzalu ticket,
// since the presented ticket does not match any known pattern of event ID,
// product ID and signing key.
export function SecondPartyTicketVerifyScreen() {
  const query = useQuery();
  // JSON.stringify(SerializedPCD<ZKEdDSAEventTicketPCDPackage>)
  const encodedQRPayload = query.get("pcd");
  const id = query.get("id");
  const [verifyResult, setVerifyResult] = useState<VerifyResult | undefined>();
  const pcds = usePCDCollection();
  const stateContext = useStateContext();

  useEffect(() => {
    (async () => {
      if (encodedQRPayload) {
        const result = await deserializeAndVerify(
          encodedQRPayload,
          stateContext
        );
        setVerifyResult(result);
      } else {
        const payload = JSON.parse(Buffer.from(id, "base64").toString());
        const result = await verifyById(
          payload.ticketId,
          payload.timestamp,
          stateContext
        );
        setVerifyResult(result);
      }
    })();
  }, [setVerifyResult, pcds, encodedQRPayload, id, stateContext]);

  const bg =
    verifyResult && verifyResult.outcome === VerifyOutcome.KnownTicketType
      ? "primary"
      : "gray";

  let icon = icons.verifyInProgress;
  if (verifyResult) {
    if (verifyResult.outcome === VerifyOutcome.NotVerified) {
      // The "invalid" icon is used for PCDs which are formally valid but
      // unknown
      icon = icons.verifyInvalid;
    } else {
      icon = icons.verifyValid;
    }
  }

  return (
    <AppContainer bg={bg}>
      <Spacer h={48} />

      <TextCenter>
        <img draggable="false" width="90" height="90" src={icon} />
        <Spacer h={24} />
        {!verifyResult && <H4>VERIFYING PROOF...</H4>}
        {verifyResult &&
          verifyResult.outcome === VerifyOutcome.KnownTicketType && (
            <>
              <H4 col="var(--accent-dark)">PROOF VERIFIED.</H4>
            </>
          )}
        {verifyResult && verifyResult.outcome === VerifyOutcome.NotVerified && (
          <H4>PROOF INVALID.</H4>
        )}
      </TextCenter>
      <Spacer h={48} />
      <Placeholder minH={160}>
        {verifyResult && verifyResult.outcome === VerifyOutcome.NotVerified && (
          <TextCenter>{verifyResult.message}</TextCenter>
        )}
        {verifyResult &&
          verifyResult.outcome === VerifyOutcome.KnownTicketType && (
            <VerifiedAndKnownTicket
              productId={verifyResult.productId}
              category={verifyResult.group}
              publicKeyName={verifyResult.publicKeyName}
            />
          )}
      </Placeholder>
      <Spacer h={64} />
      {verifyResult && (
        <CenterColumn w={280}>
          <LinkButton to="/scan">Verify another</LinkButton>
          <Spacer h={8} />
          <LinkButton to="/">Back to Zupass</LinkButton>
          <Spacer h={24} />
        </CenterColumn>
      )}
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
  category
}: {
  productId: string;
  publicKeyName: string;
  category: KnownTicketGroup;
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
      />
    );
  }
}

/**
 * Deserialize the PCD, and send it to the server for verification.
 * This checks both that the PCD has a valid structure, with a proof that
 * matches the claim, and whether or not the ticket matches a known group
 * of tickets, e.g. Zuzalu or Zuconnect tickets.
 *
 * Returns a {@link VerifyResult}
 */
async function deserializeAndVerify(
  pcdStr: string,
  stateContext: StateContextValue
): Promise<VerifyResult> {
  // decodedPCD is a JSON.stringify'd {@link SerializedPCD}
  const decodedPCD = decodeQRPayload(pcdStr);

  const result = await secondPartyCheckByPCDWithOffline(
    decodedPCD,
    stateContext
  );

  if (result.success && result.value.verified) {
    const pcd = await stateContext
      .getState()
      .pcds.deserialize(JSON.parse(decodedPCD));

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
          group: result.value.group
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
  timestamp: string,
  stateContext: StateContextValue
): Promise<VerifyResult> {
  const result = await secondPartyCheckByIdWithOffline(
    ticketId,
    timestamp,
    stateContext
  );

  if (result.success && result.value.verified) {
    return {
      outcome: VerifyOutcome.KnownTicketType,
      productId: result.value.productId,
      publicKeyName: result.value.publicKeyName,
      group: result.value.group
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
