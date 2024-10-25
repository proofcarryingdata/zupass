import {
  ClientConnectionState,
  useParcnetClient
} from "@parcnet-js/app-connector-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { TryIt } from "../components/TryIt";

export function Identity(): ReactNode {
  const { z, connectionState } = useParcnetClient();
  const [commitmentV3, setCommitmentV3] = useState<bigint | undefined>(
    undefined
  );
  const [commitmentV4, setCommitmentV4] = useState<bigint | undefined>(
    undefined
  );
  const [publicKey, setPublicKey] = useState<string | undefined>(undefined);

  return connectionState !== ClientConnectionState.CONNECTED ? null : (
    <div>
      <h1 className="text-xl font-bold mb-2">Identity</h1>
      <div className="prose">
        <div>
          <p>
            Getting the v3 identity commitment is done like this:
            <code className="block text-xs font-base rounded-md p-2">
              await z.identity.getSemaphoreV3Commitment();
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                const commitment = await z.identity.getSemaphoreV3Commitment();
                setCommitmentV3(commitment);
              } catch (e) {
                console.log(e);
              }
            }}
            label="Get v3 identity commitment"
          />
          {commitmentV3 !== undefined && (
            <p>Commitment: {commitmentV3.toString()}</p>
          )}
        </div>
        <div>
          <p>
            Getting the v4 identity commitment is done like this:
            <code className="block text-xs font-base rounded-md p-2">
              await z.identity.getSemaphoreV4Commitment();
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                const commitment = await z.identity.getSemaphoreV4Commitment();
                setCommitmentV4(commitment);
              } catch (e) {
                console.log(e);
              }
            }}
            label="Get v4 identity commitment"
          />
          {commitmentV4 !== undefined && (
            <p>Commitment: {commitmentV4.toString()}</p>
          )}
        </div>
        <div>
          <p>
            Getting the public key is done like this:
            <code className="block text-xs font-base rounded-md p-2">
              await z.identity.getPublicKey();
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                const publicKey = await z.identity.getPublicKey();
                setPublicKey(publicKey);
              } catch (e) {
                console.log(e);
              }
            }}
            label="Get v4 public key"
          />
          {publicKey !== undefined && <p>Public Key: {publicKey}</p>}
        </div>
      </div>
    </div>
  );
}
