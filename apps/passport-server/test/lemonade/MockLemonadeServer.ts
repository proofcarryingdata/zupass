import { loadDevMessages, loadErrorMessages } from "@apollo/client/dev";
import { GraphQLRequest, GraphQLVariables, RequestHandler, graphql } from "msw";
import { LemonadeTicketType } from "../../src/apis/lemonade/lemonadeAPI";
import { LemonadeDataMocker } from "./LemonadeDataMocker";

loadDevMessages();

loadErrorMessages();

export function getMockLemonadeHandlers(
  mocker: LemonadeDataMocker
): RequestHandler[] {
  const handlers = [];

  const checkClientId = (
    mocker: LemonadeDataMocker,
    req: GraphQLRequest<GraphQLVariables>
  ): string => {
    const clientId = req.headers.get("Authorization")?.split(" ")[1];
    if (!clientId || !mocker.getAccount(clientId)) {
      throw new Error(`Invalid client ID: ${clientId}`);
    }
    return clientId;
  };

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
      const eventId = req.variables["eventId"];
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
    })
  );

  return handlers;
}
