import { SerializedPCD } from "@pcd/pcd-types";
import { ReactNode, useState } from "react";
import { TryIt } from "../components/TryIt";
import { useEmbeddedZupass } from "../hooks/useEmbeddedZupass";

export function Identity(): ReactNode {
  const { z, connected } = useEmbeddedZupass();
  const [commitment, setCommitment] = useState<bigint | undefined>(undefined);
  const [emails, setEmails] = useState<SerializedPCD[]>([]);

  return !connected ? null : (
    <div>
      <h1 className="text-xl font-bold mb-2">Identity</h1>
      <div className="prose">
        <div>
          <p>
            Getting the identity commitment is done like this:
            <code className="block text-xs font-base rounded-md p-2">
              await z.identity.getIdentityCommitment();
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                const commitment = await z.identity.getIdentityCommitment();
                setCommitment(commitment);
              } catch (e) {
                console.log(e);
              }
            }}
            label="Get identity commitment"
          />
          {commitment && <p>Commitment: {commitment.toString()}</p>}
        </div>
        <div>
          <p>
            Getting the attested emails is done like this:
            <code className="block text-xs font-base rounded-md p-2">
              await z.identity.getAttestedEmails();
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                const emails = await z.identity.getAttestedEmails();
                setEmails(emails);
              } catch (e) {
                console.log(e);
              }
            }}
            label="Get attested emails"
          />
          {emails.length > 0 && (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(emails, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
