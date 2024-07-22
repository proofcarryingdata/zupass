import { loadDevMessages, loadErrorMessages } from "@apollo/client/dev";
import { randomUUID } from "crypto";
import { stringify as csv_stringify } from "csv-stringify/sync";
import { MockedRequest, RequestHandler, graphql, rest } from "msw";
import urljoin from "url-join";
import {
  LemonadeTicket,
  LemonadeTicketType
} from "../../src/apis/lemonade/types";
import { LemonadeDataMocker } from "./LemonadeDataMocker";

// Email field is created during parsing and is not present in the back-end
export type LemonadeBackendTicket = Omit<LemonadeTicket, "email">;

export function loadApolloErrorMessages(): void {
  // Apollo client doesn't load error messages by default so we have to call this
  loadDevMessages();
  loadErrorMessages();
}

function getClientId(mocker: LemonadeDataMocker, req: MockedRequest): string {
  const clientId = req.headers.get("Authorization")?.split(" ")[1];
  if (!clientId || !mocker.getAccount(clientId)) {
    throw new Error(`Invalid client ID: ${clientId}`);
  }
  return clientId;
}

function checkEventId(
  mocker: LemonadeDataMocker,
  clientId: string,
  eventId: string
): void {
  if (!mocker.getAccount(clientId).getTickets().has(eventId)) {
    throw new Error(`Invalid event ID ${eventId}`);
  }
}

function stringifyTickets(tickets: LemonadeBackendTicket[]): string {
  return csv_stringify(tickets, {
    header: true,
    cast: {
      // Convert checkin date to an ISO string
      date: (date) => {
        return date.toISOString();
      }
    }
  });
}

export function getMockLemonadeHandlers(
  mocker: LemonadeDataMocker,
  backendUrl: string
): RequestHandler[] {
  const handlers = [];
  /**
   * In the real API, the authorization token is an OAuth token, which maps
   * back to the client ID. For testing purposes, we just send the client ID
   * as the token, to avoid having to mock out the whole OAuth flow. We still
   * check to see if the client ID matches an account that is in the mock
   * data set.
   * See {@link TestTokenSource} and {@link LemonadeAPI.getToken()}.
   */

  // Mock GraphQL endpoints
  handlers.push(
    graphql.query("GetHostingEvents", (req, res, ctx) => {
      const clientId = getClientId(mocker, req);
      return res(
        ctx.data({
          getHostingEvents: [
            ...mocker.getAccount(clientId).getEvents().values()
          ]
        })
      );
    }),

    graphql.query("GetEventTicketTypes", (req, res, ctx) => {
      const clientId = getClientId(mocker, req);
      const eventId = req.variables["input"]["event"];
      checkEventId(mocker, clientId, eventId);
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

    graphql.mutation("UpdateEventCheckin", (req, res, ctx) => {
      const clientId = getClientId(mocker, req);
      const eventId = req.variables["event"];
      const userId = req.variables["user"];
      const active = req.variables["active"];

      try {
        mocker
          .getAccount(clientId)
          .setCheckin(eventId, userId, active ? new Date() : null);
      } catch (e) {
        return res(ctx.errors([e as Error]));
      }

      return res(ctx.data({ updateEventCheckin: true }));
    }),

    // Ticket export is not a GraphQL endpoint, but is instead a REST endpoint
    // that returns data in CSV format.
    rest.post(
      urljoin(backendUrl, "/event/:eventId/export/tickets"),
      (req, res, ctx) => {
        const clientId = getClientId(mocker, req);
        const eventId = req.params["eventId"] as string;
        checkEventId(mocker, clientId, eventId);

        const tickets = [
          ...(
            mocker.getAccount(clientId).getTickets().get(eventId) as Map<
              string,
              LemonadeTicket
            >
          ).values()
        ];
        return res(ctx.text(stringifyTickets(tickets)));
      }
    )
  );

  return handlers;
}

export function unregisteredLemonadeUserHandler(
  mocker: LemonadeDataMocker,
  backendUrl: string
): RequestHandler {
  return rest.post(
    urljoin(backendUrl, "/event/:eventId/export/tickets"),
    (req, res, ctx) => {
      const clientId = getClientId(mocker, req);
      const eventId = req.params["eventId"] as string;
      checkEventId(mocker, clientId, eventId);
      const type = [
        ...(
          mocker.getAccount(clientId).getTicketTypes().get(eventId) as Map<
            string,
            LemonadeTicketType
          >
        ).values()
      ][0];
      // Represents a ticket that has been invited to an event, but the invitee
      // has not yet registered with Lemonade. This ticket will still work.
      const tickets: LemonadeBackendTicket[] = [
        {
          _id: randomUUID(),
          assigned_email: "unregistered@example.com",
          user_email: "",
          user_name: "",
          user_first_name: "Invited",
          user_last_name: "Unregistered",
          user_id: "",
          type_id: type._id,
          type_title: type.title,
          checkin_date: null
        }
      ];
      return res(ctx.text(stringifyTickets(tickets)));
    }
  );
}

export function customLemonadeTicketHandler(
  backendUrl: string,
  tickets: LemonadeTicket[]
): RequestHandler {
  return rest.post(
    urljoin(backendUrl, "/event/:eventId/export/tickets"),
    (req, res, ctx) => {
      return res(ctx.text(stringifyTickets(tickets)));
    }
  );
}
