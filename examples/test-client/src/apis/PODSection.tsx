import { p } from "@pcd/podspec";
import { ReactNode, useState } from "react";
import { TryIt } from "../components/TryIt";
import { useEmbeddedZupass } from "../hooks/useEmbeddedZupass";

export function PODSection(): ReactNode {
  const { z, connected } = useEmbeddedZupass();
  const [serializedPODs, setSerializedPODs] = useState<string[]>([]);

  return !connected ? null : (
    <div>
      <h1 className="text-xl font-bold mb-2">PODs</h1>
      <div className="prose">
        <div>
          <p>
            Querying PODs is done like this:
            <code className="block text-xs font-base rounded-md p-2 whitespace-pre">
              {`const q = p.entries({ title: p.string() }).serialize();       
const pods = await z.pod.query(q);`}
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                const q = p.entries({ title: p.string() }).serialize();
                const pods = await z.pod.query(q);
                setSerializedPODs(pods);
              } catch (e) {
                console.log(e);
              }
            }}
            label="Query PODs"
          />
          {serializedPODs.length > 0 && (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(serializedPODs, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
