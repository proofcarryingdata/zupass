import { EdDSATicketPCD, isEdDSATicketPCD } from "@pcd/eddsa-ticket-pcd";
import { KnownTicketGroup, requestVerifyTicket } from "@pcd/passport-interface";
import { decodeQRPayload } from "@pcd/passport-ui";
import { PCDCollection } from "@pcd/pcd-collection";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { usePCDCollection, useQuery } from "../../src/appHooks";
import { CenterColumn, H4, Placeholder, Spacer, TextCenter } from "../core";
import { LinkButton } from "../core/Button";
import { icons } from "../icons";
import { AppContainer } from "../shared/AppContainer";
import {
  CardContainerExpanded,
  CardHeader,
  CardOutlineExpanded
} from "../shared/PCDCard";
import { ZuconnectKnownTicketDetails } from "../shared/cards/ZuconnectTicket";
import { ZuzaluKnownTicketDetails } from "../shared/cards/ZuzaluTicket";

// There are three possible outcomes of an attempt to verify a ticket
enum VerifyOutcome {
  // If the PCD verify() call succeeds, meaning that is is an EdDSATicketPCD
  // and has a proof that matches the claim, but is not otherwise a "known"
  // ticket type
  VerifiedPCDOnly,
  // As above, *and* If the ticket's public key, event ID and product ID
  // combination matches one that we know of
  KnownTicketType,
  // If verification failed for any reason
  NotVerified
}

type VerifyResult =
  | {
      outcome: VerifyOutcome.VerifiedPCDOnly;
      // For "unknown" but verified tickets, we get a ticket PCD
      pcd: EdDSATicketPCD;
    }
  | {
      outcome: VerifyOutcome.KnownTicketType;
      pcd: EdDSATicketPCD;
      // For known tickets, we also have a "group" and public key name
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
// Known tickets are those that are present in passport-server's database.
export function VerifyScreen() {
  const query = useQuery();
  const encodedQRPayload = query.get("pcd");
  const [verifyResult, setVerifyResult] = useState<VerifyResult | undefined>();
  const pcds = usePCDCollection();

  useEffect(() => {
    (async () => {
      const result = await deserializeAndVerify(encodedQRPayload, pcds);
      setVerifyResult(result);
    })();
  }, [encodedQRPayload, setVerifyResult, pcds]);

  const bg =
    verifyResult && verifyResult.outcome === VerifyOutcome.KnownTicketType
      ? "primary"
      : "gray";

  let icon = icons.verifyInProgress;
  if (verifyResult) {
    if (
      verifyResult.outcome === VerifyOutcome.NotVerified ||
      verifyResult.outcome === VerifyOutcome.VerifiedPCDOnly
    ) {
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
        {verifyResult &&
          verifyResult.outcome === VerifyOutcome.VerifiedPCDOnly && (
            <H4 col="var(--accent-dark)">UNKNOWN TICKET.</H4>
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
          verifyResult.outcome === VerifyOutcome.VerifiedPCDOnly && (
            <VerifiedPCDOnly pcd={verifyResult.pcd} />
          )}
        {verifyResult &&
          verifyResult.outcome === VerifyOutcome.KnownTicketType && (
            <VerifiedAndKnownTicket
              pcd={verifyResult.pcd}
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
 * If we can verify the PCD as an EdDSATicketPCD, but we can't match it
 * against a known ticket type, show a message informing the user that the
 * ticket is of unknown provenance.
 */
function VerifiedPCDOnly({ pcd }: { pcd: EdDSATicketPCD }) {
  return (
    <CardContainerExpanded>
      <CardOutlineExpanded>
        <CardHeader col="var(--accent-lite)">
          <div>
            The ticket is described as being for{" "}
            <EventName>"{pcd.claim.ticket.eventName}"</EventName>, but Zupass
            either does not recognize that event or cannot verify that the
            ticket is authentic.
          </div>
        </CardHeader>
      </CardOutlineExpanded>
    </CardContainerExpanded>
  );
}

/**
 * If the ticket is verified and is a known ticket, display a ticket-specific
 * message to the user.
 */
function VerifiedAndKnownTicket({
  pcd,
  publicKeyName,
  category
}: {
  pcd: EdDSATicketPCD;
  publicKeyName: string;
  category: KnownTicketGroup;
}) {
  // Supported tickets here are Zuzalu '23 and Zuconnect '23
  // Devconnect tickets have a separate "check-in" flow and never come here.
  if (category === KnownTicketGroup.Zuzalu23) {
    return <ZuzaluKnownTicketDetails pcd={pcd} publicKeyName={publicKeyName} />;
  } else if (category === KnownTicketGroup.Zuconnect23) {
    return (
      <ZuconnectKnownTicketDetails pcd={pcd} publicKeyName={publicKeyName} />
    );
  }
  // It's possible that we add other ticket types to passport-server's list
  // of known tickets, but that they do not belong to the above groups.
  // In that case, show a generic "VERIFIED" message indicating that the
  // ticket is good.
  return (
    <CardContainerExpanded>
      <CardOutlineExpanded>
        <CardHeader col="var(--accent-lite)">
          <div>VERIFIED</div>
        </CardHeader>
      </CardOutlineExpanded>
    </CardContainerExpanded>
  );
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
  pcds: PCDCollection
): Promise<VerifyResult> {
  // decodedPCD is a JSON.stringify'd {@link SerializedPCD}
  const decodedPCD = decodeQRPayload(pcdStr);

  const result = await requestVerifyTicket(appConfig.zupassServer, {
    pcd: decodedPCD
  });

  if (result.success && result.value.verified) {
    const pcd = await pcds.deserialize(JSON.parse(decodedPCD));

    // This check is mostly for the benefit of the TypeScript type-checker
    // If requestVerifyTicket() succeeded then the PCD type must be
    // EdDSATicketPCD
    if (isEdDSATicketPCD(pcd)) {
      if (result.value.knownTicketType) {
        return {
          outcome: VerifyOutcome.KnownTicketType,
          pcd,
          publicKeyName: result.value.publicKeyName,
          group: result.value.group
        };
      } else {
        return {
          outcome: VerifyOutcome.VerifiedPCDOnly,
          pcd
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

const EventName = styled.span`
  color: var(--white);
`;
