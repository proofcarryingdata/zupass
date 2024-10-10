import { ProveResult } from "@parcnet-js/client-rpc";
import type { PODData, PodspecProofRequest } from "@parcnet-js/podspec";
import { TicketSpec, ticketProofRequest } from "@parcnet-js/ticket-spec";
import JSONBig from "json-bigint";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { TryIt } from "../components/TryIt";
import { useParcnetClient } from "../hooks/useParcnetClient";

const EVENT_ID = "fca101d3-8c9d-56e4-9a25-6a3c1abf0fed";
const PRODUCT_ID = "59c3df09-2093-4b54-9033-7bf54b6f75db";

const request: PodspecProofRequest = {
  pods: {
    pod1: {
      pod: {
        entries: {
          wis: {
            type: "int",
            inRange: { min: BigInt(5), max: BigInt(1000) }
          },
          str: { type: "int", inRange: { min: BigInt(5), max: BigInt(1000) } }
        },
        tuples: [
          {
            entries: ["wis", "str"],
            isNotMemberOf: [
              [
                { type: "int", value: BigInt(100) },
                { type: "int", value: BigInt(500) }
              ]
            ]
          }
        ]
      },
      revealed: {
        wis: true
      }
    },
    pod2: {
      pod: {
        entries: {
          test: {
            type: "string",
            isMemberOf: [{ type: "string", value: "secret" }]
          }
        }
      },
      revealed: {
        test: true
      }
    }
  }
};

export function GPC(): ReactNode {
  const { z, connected } = useParcnetClient();
  const [proveResult, setProveResult] = useState<ProveResult>();
  const [verified, setVerified] = useState<boolean | undefined>();
  const [identityV3, setIdentityV3] = useState<bigint | undefined>();
  const [publicKey, setPublicKey] = useState<string | undefined>();
  const [ticket, setTicket] = useState<PODData | undefined>();

  useEffect(() => {
    void (async (): Promise<void> => {
      if (connected) {
        const identityV3 = await z.identity.getSemaphoreV3Commitment();
        setIdentityV3(identityV3);
        const publicKey = await z.identity.getPublicKey();
        setPublicKey(publicKey);
      }
    })();
  }, [connected, z.identity]);

  return !connected ? null : (
    <div>
      <h1 className="text-xl font-bold mb-2">GPC</h1>
      <div className="prose">
        <div>
          <p>
            Generating a GPC proof is done like this:
            <code className="block text-xs font-base rounded-md p-2 whitespace-pre-wrap">
              {`
const request: PodspecProofRequest = {
  pods: {
    pod1: {
      pod: {
        entries: {
          wis: {
            type: "int",
            inRange: { min: BigInt(5), max: BigInt(1000) }
          },
          str: { type: "int", inRange: { min: BigInt(5), max: BigInt(1000) } }
        },
        tuples: [
          {
            entries: ["wis", "str"],
            isNotMemberOf: [
              [
                { type: "int", value: BigInt(100) },
                { type: "int", value: BigInt(500) }
              ]
            ]
          }
        ]
      },
      revealed: {
        wis: true
      }
    },
    pod2: {
      pod: {
        entries: {
          test: {
            type: "string",
            isMemberOf: [{ type: "string", value: "secret" }]
          }
        }
      },
      revealed: {
        test: true
      }
    }
  }
};

const gpcProof = await z.gpc.prove({ request });

`}
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                setProveResult(await z.gpc.prove({ request }));
              } catch (e) {
                console.log(e);
              }
            }}
            label="Get GPC Proof"
          />
          {proveResult && (
            <pre className="whitespace-pre-wrap">
              {JSONBig.stringify(proveResult, null, 2)}
            </pre>
          )}
        </div>
        <div>
          <p>
            Verify a GPC proof like this:
            <code className="block text-xs font-base rounded-md p-2 whitespace-pre-wrap">
              {`
const verified = await z.gpc.verify(proof, config, revealedClaims, request);
            `}
            </code>
          </p>
          {!proveResult && (
            <span>Generate a proof above, then we can verify it.</span>
          )}
          {proveResult && (
            <TryIt
              onClick={async () => {
                try {
                  if (proveResult.success) {
                    setVerified(
                      await z.gpc.verify(
                        proveResult.proof,
                        proveResult.boundConfig,
                        proveResult.revealedClaims
                      )
                    );
                  }
                } catch (e) {
                  console.log(e);
                }
              }}
              label="Verify GPC Proof"
            />
          )}
          {verified !== undefined && (
            <pre className="whitespace-pre-wrap">
              Verified: {verified.toString()}
            </pre>
          )}
        </div>

        <div>
          <p>
            We're about to look at ticket ownership proofs. However, you might
            not have a ticket yet! Fortunately, tickets are just PODs, so you
            can generate a self-signed ticket like this:
            <code className="block text-xs font-base rounded-md p-2 whitespace-pre-wrap">
              {`
const ticketData = {
  ticketId: "302bdf00-60d9-4b0c-a07b-a6ef64d27a71",
  eventId: "${EVENT_ID}",
  productId: "${PRODUCT_ID}",
  ticketName: "Ticket 1",
  eventName: "Event 1",
  ticketSecret: "secret123",
  timestampConsumed: 1714857600,
  timestampSigned: 1714857600,
  attendeeSemaphoreId: ${identityV3},
  owner: "${publicKey}",
  isConsumed: 0,
  isRevoked: 0,
  ticketCategory: 0,
  attendeeName: "John Doe",
  attendeeEmail: "test@example.com"
};

const entries = TicketSpec.parseEntries(ticketData, { coerce: true });
const pod = await z.pod.sign(entries);
await z.pod.insert(pod);
              `}
            </code>
          </p>
          <TryIt
            onClick={async () => {
              const ticketData = {
                ticketId: "302bdf00-60d9-4b0c-a07b-a6ef64d27a71",
                eventId: EVENT_ID,
                productId: PRODUCT_ID,
                ticketName: "Ticket 1",
                eventName: "Event 1",
                ticketSecret: "secret123",
                timestampConsumed: 1714857600,
                timestampSigned: 1714857600,
                attendeeSemaphoreId: identityV3 as bigint,
                owner: publicKey as string,
                isConsumed: 0,
                isRevoked: 0,
                ticketCategory: 0,
                attendeeName: "John Doe",
                attendeeEmail: "test@example.com"
              };

              const entries = TicketSpec.parseEntries(ticketData, {
                coerce: true
              });

              const pod = await z.pod.sign(entries);
              await z.pod.collection("Apples").insert(pod);
              setTicket(pod);
            }}
            label="Generate Ticket"
          />
          {ticket && (
            <div>
              Ticket signed successfully! The signature is{" "}
              <code className="block text-xs font-base rounded-md p-2 whitespace-pre">
                {ticket?.signature}
              </code>
            </div>
          )}
        </div>

        <div>
          <p>
            Generating a ticket ownership proof is done like this:
            <code className="block text-xs font-base rounded-md p-2 whitespace-pre-wrap">
              {`
const request = ticketProofRequest({
  classificationTuples: [
    {
      signerPublicKey: "${publicKey}",
      eventId: "${EVENT_ID}"
    }
  ],
  fieldsToReveal: {
    attendeeName: true,
    attendeeEmail: true
  }
});

const gpcProof = await z.gpc.prove({ request: request.schema });

`}
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                const request = ticketProofRequest({
                  classificationTuples: [
                    {
                      signerPublicKey: await z.identity.getPublicKey(),
                      eventId: EVENT_ID
                    }
                  ],
                  fieldsToReveal: {
                    attendeeName: true,
                    attendeeEmail: true
                  }
                });
                setProveResult(await z.gpc.prove({ request: request.schema }));
              } catch (e) {
                console.log(e);
              }
            }}
            label="Get Ticket Proof"
          />
          {proveResult && (
            <pre className="whitespace-pre-wrap">
              {JSONBig.stringify(proveResult, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
