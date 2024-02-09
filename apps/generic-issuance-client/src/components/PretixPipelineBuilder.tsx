import {
  GenericIssuanceFetchPretixEventsResponseValue,
  PipelineType,
  PretixPipelineDefinition,
  PretixProductConfig,
  requestGenericIssuanceFetchPretixEvents,
  requestGenericIssuanceFetchPretixProducts
} from "@pcd/passport-interface";
import { ChangeEvent, ReactNode, useState } from "react";
import { v4 as uuidV4 } from "uuid";
import { ZUPASS_SERVER_URL } from "../constants";

interface PretixPipelineBuilderProps {
  onCreate: (pipelineStringified: string) => Promise<void>;
}

export default function PretixPipelineBuilder(
  props: PretixPipelineBuilderProps
): ReactNode {
  const [orgUrl, setOrgUrl] = useState("");
  const [token, setToken] = useState("");
  const [events, setEvents] =
    useState<GenericIssuanceFetchPretixEventsResponseValue>();
  const [selectedEvent, setSelectedEvent] = useState<string | undefined>();
  const [products, setProducts] = useState<PretixProductConfig[]>();

  const handleSelectEvent = async (
    e: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    setSelectedEvent(e.target.value);
    const response = await requestGenericIssuanceFetchPretixProducts(
      ZUPASS_SERVER_URL,
      { orgUrl, token, eventID: e.target.value }
    );
    if (response.success) {
      setProducts(
        response.value.map((p) => ({
          externalId: p.id.toString(),
          name: Object.values(p.name).join(", "),
          isSuperUser: false,
          genericIssuanceId: uuidV4()
        }))
      );
    }
  };

  const toggleSuperUser = (externalId: string): void => {
    setProducts((products) => {
      const updatedProducts = products?.map((config) =>
        config.externalId === externalId
          ? { ...config, isSuperUser: !config.isSuperUser }
          : config
      );
      return updatedProducts;
    });
  };

  return (
    <div>
      <form
        onSubmit={async (e): Promise<void> => {
          e.preventDefault();
          if (!orgUrl || !token) {
            alert("You must enter both fields");
            return;
          }
          const response = await requestGenericIssuanceFetchPretixEvents(
            ZUPASS_SERVER_URL,
            { orgUrl, token }
          );
          if (response.success) {
            setEvents(response.value);
          } else {
            alert("Response failed");
            console.error(response.error);
          }
        }}
      >
        <div>
          <label htmlFor="orgUrl">Pretix Organizer URL:</label>
          <input
            type="url"
            id="orgUrl"
            name="orgUrl"
            value={orgUrl}
            onChange={(e): void => setOrgUrl(e.target.value)}
            placeholder="Enter Pretix Organizer URL"
          />
        </div>
        <div>
          <label htmlFor="token">API Token:</label>
          <input
            type="text"
            id="token"
            name="token"
            value={token}
            onChange={(e): void => setToken(e.target.value)}
            placeholder="Enter API Token"
          />
        </div>
        <button type="submit">Submit</button>
      </form>
      {events && !events.length && <div>Your organizer has no events.</div>}
      {!!events?.length && (
        <div>
          <h2>Your Events</h2>
          {events.map((e) => (
            <div key={e.slug}>
              <input
                type="radio"
                name="event"
                value={e.slug}
                checked={selectedEvent === e.slug}
                onChange={handleSelectEvent}
              />
              <label htmlFor={e.slug}>
                {e.slug} ({Object.values(e.name).join(", ")})
              </label>
            </div>
          ))}
        </div>
      )}
      {selectedEvent && products && !products.length && (
        <div>Your event has no products.</div>
      )}
      {selectedEvent && !!products?.length && (
        <div>
          <h2>Your products</h2>
          <table>
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Name</th>
                <th>Is Super User</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.externalId}>
                  <td>{p.externalId}</td>
                  <td>{p.name}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={p.isSuperUser}
                      onChange={(): void => toggleSuperUser(p.externalId)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={(): Promise<void> => {
              const pipeline: Partial<PretixPipelineDefinition> = {
                type: PipelineType.Pretix,
                timeCreated: new Date().toISOString(),
                timeUpdated: new Date().toISOString(),
                editorUserIds: [],
                options: {
                  feedOptions: {
                    feedId: "example-feed-id",
                    feedDisplayName: "Example Feed",
                    feedDescription: "Your description here...",
                    feedFolder: "Example Folder"
                  },
                  pretixAPIKey: token,
                  pretixOrgUrl: orgUrl,
                  events: [
                    {
                      externalId: selectedEvent,
                      genericIssuanceId: uuidV4(),
                      products,
                      // TODO: Really hacky, will fix in next level of fidelity
                      name: Object.values(
                        events?.find((e) => e.slug === selectedEvent)?.name ??
                          {}
                      ).join(", ")
                    }
                  ]
                }
              };
              return props.onCreate(JSON.stringify(pipeline));
            }}
          >
            Create Pipeline
          </button>
        </div>
      )}
    </div>
  );
}
