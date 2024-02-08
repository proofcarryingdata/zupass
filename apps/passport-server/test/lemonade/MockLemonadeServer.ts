import { loadDevMessages, loadErrorMessages } from "@apollo/client/dev";
import { stringify } from "csv-stringify/sync";
import { MockedRequest, RequestHandler, graphql, rest } from "msw";
import urljoin from "url-join";
import {
  LemonadeTicket,
  LemonadeTicketType
} from "../../src/apis/lemonade/lemonadeAPI";
import { LemonadeDataMocker } from "./LemonadeDataMocker";

// Apollo client doesn't load error messages by default so we have to call this
loadDevMessages();
loadErrorMessages();

export function getMockLemonadeHandlers(
  mocker: LemonadeDataMocker,
  backendUrl: string
): RequestHandler[] {
  const handlers = [];

  // In the real API, the authorization token is an OAuth token, which maps
  // back to the client ID. For testing purposes, we just send the client ID
  // as the token, to avoid having to mock out the whole OAuth flow.
  // TODO actually mock this with a bit more fidelity, so we can mock token expiry
  const checkClientId = (
    mocker: LemonadeDataMocker,
    req: MockedRequest
  ): string => {
    const clientId = req.headers.get("Authorization")?.split(" ")[1];
    if (!clientId || !mocker.getAccount(clientId)) {
      throw new Error(`Invalid client ID: ${clientId}`);
    }
    return clientId;
  };

  // Mock GraphQL endpoints
  handlers.push(
    graphql.query("GetHostingEvents", (req, res, ctx) => {
      const clientId = checkClientId(mocker, req);
      return res(
        ctx.data({
          getHostingEvents: [
            ...mocker.getAccount(clientId).getEvents().values()
          ]
        })
      );
    }),

    graphql.query("GetEventTicketTypes", (req, res, ctx) => {
      const clientId = checkClientId(mocker, req);
      const eventId = req.variables["input"]["event"];
      if (!mocker.getAccount(clientId).getEvents().has(eventId)) {
        throw new Error(`Invalid event ID ${eventId}`);
      }
      return res(
        ctx.data({
          getEventTicketTypes: {
            __typename: "GetEventTicketTypesResponse",
            ticket_types: [
              ...(
                mocker
                  .getAccount(clientId)
                  .getTicketTypes()
                  .get(eventId) as Map<string, LemonadeTicketType>
              ).values()
            ]
          }
        })
      );
    }),
    rest.post(
      urljoin(backendUrl, "/event/:eventId/export/tickets"),
      (req, res, ctx) => {
        const clientId = checkClientId(mocker, req);
        const eventId = req.params["eventId"] as string;
        if (!mocker.getAccount(clientId).getTickets().has(eventId)) {
          throw new Error(`Invalid event ID ${eventId}`);
        }
        const tickets = [
          ...(
            mocker.getAccount(clientId).getTickets().get(eventId) as Map<
              string,
              LemonadeTicket
            >
          ).values()
        ];
        return res(ctx.text(stringify(tickets, { header: true })));
      }
    ),

    graphql.mutation("UpdateEventCheckin", (req, res, ctx) => {
      const clientId = checkClientId(mocker, req);
      const eventId = req.variables["event"];
      const userId = req.variables["user"];

      try {
        mocker.getAccount(clientId).checkinUser(eventId, userId);
      } catch (e) {
        return res(ctx.errors([e as Error]));
      }

      return res(ctx.data({ updateEventCheckin: true }));
    })
  );

  return handlers;
}
