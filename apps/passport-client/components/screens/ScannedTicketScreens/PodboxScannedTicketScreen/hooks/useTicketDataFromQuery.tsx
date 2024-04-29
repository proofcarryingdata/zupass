import { decodeQRPayload } from "@pcd/passport-ui";
import { randomUUID } from "@pcd/util";
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
        // const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(
        //   JSON.parse(decodedPCD).pcd
        // );
        const {
          t: ticketId,
          e: eventId,
          p: { a, b, c }
        } = JSON.parse(decodedPayload);
        console.log({ decodedPayload });
        // TODO: check timestamp
        if (!ticketId || !eventId || !a || !b || !c) {
          setTicketData({
            state: TicketIdState.Error,
            error: "Ticket data is invalid. Please try scanning again."
          });
          return;
        }
        // TODO: Packing and unpacking
        // const unpackedA = unpackPoint(BigInt(a));
        // const unpackedC = unpackPoint(BigInt(c));
        // console.log({ unpackedA, unpackedC });
        // if (!unpackedA || !unpackedC) {
        //   setTicketData({
        //     state: TicketIdState.Error,
        //     error: "Proof data is invalid. Please try scanning again."
        //   });
        //   return;
        // }

        const proof: Groth16Proof = {
          protocol: "groth16",
          curve: "bn128",
          pi_a: a,
          pi_b: b,
          pi_c: c
        };
        const validEventIds = [eventId];
        // const verified = await ZKEdDSAEventTicketPCDPackage.verify(pcd);
        const reconstructedPCD = reconstructZKEdDSAEventTicketPCD(
          ticketId,
          validEventIds,
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
        ticketId
      },
      validEventIds,
      watermark: "1"
    },
    proof
  };
}
