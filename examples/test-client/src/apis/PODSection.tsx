import { POD, POD_INT_MAX } from "@pcd/pod";
import { p } from "@pcd/podspec";
import { ReactNode, useState } from "react";
import { TryIt } from "../components/TryIt";
import { useEmbeddedZupass } from "../hooks/useEmbeddedZupass";

export function PODSection(): ReactNode {
  const { z, connected } = useEmbeddedZupass();
  const [pods, setPODs] = useState<POD[]>([]);

  return !connected ? null : (
    <div>
      <h1 className="text-xl font-bold mb-2">PODs</h1>
      <div className="prose">
        <div>
          <p>
            Querying PODs is done like this:
            <code className="block text-xs font-base rounded-md p-2 whitespace-pre">
              {`const q = p
  .pod({
    wis: p.int().range(BigInt(8), POD_INT_MAX),
    str: p.int().range(BigInt(5), POD_INT_MAX),
  })
  .serialize();
const pods = await z.pod.query(q);
`}
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                const q = p.pod({
                  wis: p.int().range(BigInt(8), POD_INT_MAX),
                  str: p.int().range(BigInt(5), POD_INT_MAX)
                });
                const pods = await z.pod.query(q);
                setPODs(pods);
              } catch (e) {
                console.log(e);
              }
            }}
            label="Query PODs"
          />
          {pods.length > 0 && (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(pods, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
