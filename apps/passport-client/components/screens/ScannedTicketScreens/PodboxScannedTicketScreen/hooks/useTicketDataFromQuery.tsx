import { decodeQRPayload } from "@pcd/passport-ui";
import { decodeGroth16Proof, randomUUID } from "@pcd/util";
import {
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { useEffect, useState } from "react";
import { Groth16Proof } from "snarkjs";
import { useQuery } from "../../../../../src/appHooks";

export enum TicketIdState {
  Loading,
  Success,
  Error
}

export type TicketIdAndEventId =
  | { state: TicketIdState.Loading }
  | {
      state: TicketIdState.Success;
      ticketId: string;
      eventId: string;
      zkMode: boolean;
    }
  | {
      state: TicketIdState.Error;
      error: string;
    };

/**
 * The {@link PodboxScannedTicketScreen} receives a ticket from the scanner
 * via the `id` query string parameter. This hook attempts to load the ticket
 * from the query string parameter, and returns the status of that load by
 * returning a {@link TicketIdAndEventId}.
 */
export function useTicketDataFromQuery(): TicketIdAndEventId {
  const query = useQuery();
  const id = query?.get("id");
  const pcdStr = query?.get("pcd");

  const [ticketData, setTicketData] = useState<TicketIdAndEventId>({
    state: TicketIdState.Loading
  });

  useEffect(() => {
    if (!id && pcdStr) {
      const decodedPayload = decodeQRPayload(pcdStr);
      const verify = async (): Promise<void> => {
        const [ticketId, productId, eventId, ...packedProof] =
          JSON.parse(decodedPayload);
        console.log({ decodedPayload });
        if (!ticketId || !productId || !eventId || packedProof.length !== 8) {
          setTicketData({
            state: TicketIdState.Error,
            error: "Ticket data is invalid. Please try scanning again."
          });
          return;
        }

        const proof = decodeGroth16Proof(packedProof);
        console.log({ proof, decodedPayload });
        const reconstructedPCD = reconstructZKEdDSAEventTicketPCD(
          ticketId,
          productId,
          [eventId],
          proof
        );
        const verified =
          await ZKEdDSAEventTicketPCDPackage.verify(reconstructedPCD);
        console.log({
          reconstructedPCD,
          verified
        });

        if (verified) {
          setTicketData({
            state: TicketIdState.Success,
            ticketId,
            eventId,
            zkMode: true
          });
        } else {
          setTicketData({
            state: TicketIdState.Error,
            error: "Could not verify ticket. Please try scanning again."
          });
        }
      };

      verify();
    } else if (id) {
      // TODO check the timestamp also included here
      const { ticketId, eventId } = JSON.parse(
        Buffer.from(id, "base64").toString()
      );
      setTicketData({
        state: TicketIdState.Success,
        ticketId,
        eventId,
        zkMode: false
      });
    }
  }, [id, pcdStr]);

  return ticketData;
}

function reconstructZKEdDSAEventTicketPCD(
  ticketId: string,
  productId: string,
  validEventIds: string[],
  proof: Groth16Proof
): ZKEdDSAEventTicketPCD {
  return {
    id: randomUUID(),
    type: ZKEdDSAEventTicketPCDPackage.name,
    claim: {
      signer: [
        "0f36c5fb0a7c133766f327f823f72ddc01feaab779e1970f90e3c2eda2ba96a6",
        "1036b75bd06ef48fc98d8a9ad11b42f59d07c1316edf25cf949a87de79d99d1d"
      ],
      partialTicket: {
        ticketId,
        productId
      },
      validEventIds,
      watermark: "1"
    },
    proof
  };
}
