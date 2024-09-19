import type { PodspecProofRequest } from "@parcnet-js/podspec";
import JSONBig from "json-bigint";
import type { ReactNode } from "react";
import { useState } from "react";
import type { ProveResult } from "../../../../packages/client-rpc/src";
import { TryIt } from "../components/TryIt";
import { useParcnetClient } from "../hooks/useParcnetClient";

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

const gpcProof = await z.gpc.prove(request);

`}
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                setProveResult(await z.gpc.prove(request));
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
                        proveResult.revealedClaims,
                        request
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
      </div>
    </div>
  );
}
