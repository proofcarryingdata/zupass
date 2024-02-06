import { loadDevMessages, loadErrorMessages } from "@apollo/client/dev";
import { RequestHandler, graphql } from "msw";

loadDevMessages();

loadErrorMessages();

export function getMockLemonadeHandlers(): RequestHandler[] {
//mocker: LemonadeDataMocker
  const handlers = [];

  handlers.push(
    graphql.query("GetHostingEvents", (_req, res, ctx) => {
      return res(
        ctx.data({
          getHostingEvents: [
            {
              __typename: "Event",
              _id: "65c1faf41770460a0bb9aa1e",
              title: "Test event",
              description: "Testing Lemonade-Zupass sync",
              start: "2024-02-09T09:00:00.613Z",
              end: "2024-02-12T17:00:00.613Z",
              url_go:
                "https://go.staging.lemonade.social/e/WVIQCzLI/Test-event",
              slug: "Test-event",
              cover: null,
              new_photos: [],
              guest_limit: 100,
              guest_limit_per: 2
            }
          ]
        })
      );
    }),

    graphql.query("GetEventTicketTypes", (_req, res, ctx) => {
      return res(
        ctx.data({
          getEventTicketTypes: {
            __typename: "GetEventTicketTypesResponse",
            ticket_types: [
              {
                __typename: "PurchasableTicketType",
                _id: "65c1faf41770460a0bb9aa1f",
                title: "Ticket",
                prices: [
                  {
                    __typename: "EventTicketPrice",
                    cost: "0",
                    currency: "USD",
                    default: null,
                    network: null
                  }
                ]
              }
            ]
          }
        })
      );
    })
  );

  return handlers;
}
