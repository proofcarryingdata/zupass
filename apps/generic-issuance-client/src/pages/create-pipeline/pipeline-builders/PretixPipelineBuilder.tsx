import {
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Input,
  Radio,
  RadioGroup
} from "@chakra-ui/react";
import {
  FeedIssuanceOptions,
  GenericIssuanceFetchPretixEventsResponseValue,
  PipelineType,
  PretixPipelineDefinition,
  PretixProductConfig,
  getI18nString,
  requestGenericIssuanceFetchPretixEvents,
  requestGenericIssuanceFetchPretixProducts
} from "@pcd/passport-interface";
import { ChangeEvent, ReactNode, useState } from "react";
import { v4 as uuidV4 } from "uuid";
import { ZUPASS_SERVER_URL } from "../../../constants";
import { useJWT } from "../../../helpers/userHooks";
import { DEFAULT_FEED_OPTIONS } from "../../SamplePipelines";
import { FeedOptions } from "./FeedOptions";

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
  const [feedOptions, setFeedOptions] =
    useState<FeedIssuanceOptions>(DEFAULT_FEED_OPTIONS);

  const jwt = useJWT();

  if (!jwt) {
    window.location.href = "/";
    return;
  }

  const handleSelectEvent = async (
    e: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    setSelectedEvent(e.target.value);
    const response = await requestGenericIssuanceFetchPretixProducts(
      ZUPASS_SERVER_URL,
      { jwt, orgUrl, token, eventID: e.target.value }
    );
    if (response.success) {
      setProducts(
        response.value.map((p) => ({
          externalId: p.id.toString(),
          name: getI18nString(p.name),
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
    <>
      <form
        onSubmit={async (e): Promise<void> => {
          e.preventDefault();
          if (!orgUrl || !token) {
            alert("You must enter both fields");
            return;
          }
          const response = await requestGenericIssuanceFetchPretixEvents(
            ZUPASS_SERVER_URL,
            { jwt, orgUrl, token }
          );
          if (response.success) {
            setEvents(response.value);
          } else {
            alert("Response failed");
            console.error(response.error);
          }
        }}
      >
        <FormControl>
          <FormLabel htmlFor="orgUrl">Pretix Organizer URL</FormLabel>
          <Input
            width="lg"
            type="url"
            id="orgUrl"
            name="orgUrl"
            value={orgUrl}
            onChange={(e): void => setOrgUrl(e.target.value)}
            placeholder="Enter Pretix Organizer URL"
          />
        </FormControl>

        <FormControl>
          <FormLabel htmlFor="token">API Token:</FormLabel>
          <Input
            width="lg"
            type="text"
            id="token"
            name="token"
            value={token}
            onChange={(e): void => setToken(e.target.value)}
            placeholder="Enter API Token"
          />
        </FormControl>

        <Button width="sm" type="submit" variant="outline" colorScheme="green">
          Search for events
        </Button>
      </form>

      {events && !events.length && <div>Your organizer has no events.</div>}

      {!!events?.length && (
        <FormControl>
          <FormLabel>Select An Event</FormLabel>
          <RadioGroup>
            {events.map((e) => (
              <div key={e.slug}>
                <Radio
                  name="event"
                  value={e.slug}
                  isChecked={selectedEvent === e.slug}
                  onChange={handleSelectEvent}
                >
                  {e.slug} ({getI18nString(e.name)})
                </Radio>
              </div>
            ))}
          </RadioGroup>
        </FormControl>
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
                    <Checkbox
                      isChecked={p.isSuperUser}
                      onChange={(): void => toggleSuperUser(p.externalId)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <FeedOptions
            feedOptions={feedOptions}
            setFeedOptions={setFeedOptions}
          />

          <Button
            onClick={(): Promise<void> => {
              const pipeline: Partial<PretixPipelineDefinition> = {
                type: PipelineType.Pretix,
                timeCreated: new Date().toISOString(),
                timeUpdated: new Date().toISOString(),
                editorUserIds: [],
                options: {
                  feedOptions,
                  pretixAPIKey: token,
                  pretixOrgUrl: orgUrl,
                  events: [
                    {
                      externalId: selectedEvent,
                      genericIssuanceId: uuidV4(),
                      products,
                      name: getI18nString(
                        // TODO: Really hacky, will fix in next level of fidelity
                        events?.find((e) => e.slug === selectedEvent)?.name ??
                          {}
                      )
                    }
                  ]
                }
              };
              return props.onCreate(JSON.stringify(pipeline));
            }}
          >
            Create Pipeline
          </Button>
        </div>
      )}
    </>
  );
}
