import { ReactNode } from "react";
import { TryIt } from "../components/TryIt";
import { useEmbeddedZupass } from "../hooks/useEmbeddedZupass";

export function Feeds(): ReactNode {
  const { z, connected } = useEmbeddedZupass();

  return !connected ? null : (
    <div>
      <h1 className="text-xl font-bold mb-2">Feeds</h1>
      <div className="prose">
        <div>
          <p>
            Adding a feed is done like this:
            <code className="block text-xs font-base rounded-md p-2">
              await
              z.feeds.requestAddSubscription("http://localhost:3002/generic-issuance/api/feed/494bd312-4b97-48e4-8693-be93bdbfa80d/default-feed","default-feed");
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                await z.feeds.requestAddSubscription(
                  "http://localhost:3002/generic-issuance/api/feed/494bd312-4b97-48e4-8693-be93bdbfa80d/default-feed",
                  "default-feed"
                );
              } catch (e) {
                console.log(e);
              }
            }}
            label="Add subscription"
          />
        </div>
      </div>
    </div>
  );
}
