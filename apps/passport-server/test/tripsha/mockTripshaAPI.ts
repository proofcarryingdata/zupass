import { RestHandler, rest } from "msw";
import { SetupServer, setupServer } from "msw/node";
import urljoin from "url-join";

export const MOCK_ZUCONNECT_TRIPSHA_URL = "http://tripsha.example.com";
export const MOCK_ZUCONNECT_TRIPSHA_KEY = "mock-auth-key";

// An empty response
export const badEmptyResponse = {};

// A response with a faulty ticket.
export const badTicketsResponse = {
  tickets: [
    {
      id: "65012572b5f4a42c66422b9f",
      ticketName: "ZuConnect Resident Pass",
      // Ticket has no email address
      first: "Test",
      last: "One"
    }
  ]
};

// A response with an incorrect ticketName.
export const badTicketNameResponse = {
  tickets: [
    {
      id: "65012572b5f4a42c66422b9f",
      ticketName: "ZuConnect Root Administrator",
      email: "testing@example.com",
      first: "Test",
      last: "One"
    }
  ]
};

// A response that parses correctly.
export const goodResponse = {
  tickets: [
    {
      id: "65012572b5f4a42c66422b9f",
      ticketName: "ZuConnect Resident Pass",
      email: "test1@example.com",
      first: "Test",
      last: "One"
    },
    {
      id: "6501284fb5f4a42c66426353",
      ticketName: "ZuConnect Resident Pass",
      email: "test2@example.com",
      first: "Test Two",
      last: null
    },
    {
      id: "65018334b5f4a42c6648d4e2",
      ticketName: "ZuConnect Resident Pass",
      email: "test3@example.com",
      first: "",
      last: "Test Three"
    },
    {
      id: "65018a79b5f4a42c6649604d",
      ticketName: "Latecomer Pass",
      email: "test4@example.com",
      first: "Test Four",
      last: ""
    },
    {
      id: "6501996fb5f4a42c664a8626",
      // @todo stop allowing default values for name
      email: "test5@example.com",
      first: "Test Five",
      last: undefined
    },
    {
      id: "454ab77c700e87a8897f72a",
      ticketName: "For people only using Day Passes (add-ons)",
      email: "test6@example.com",
      first: "Test",
      last: "Six",
      options: [
        {
          id: "601fed54-a065-4a55-9846-46534eff59f9",
          name: "Tuesday Oct 31 - Neuroscience"
        },
        {
          id: "1ef87069-c90c-4f0a-892e-ace558f6aeae",
          name: "Wednesday Nov 1 - New Governance"
        }
      ]
    }
  ]
};

/**
 * Make a mock handler for a given sample response.
 */
// Allow `any` because the data is sometimes JSON that intentionally matches
// no known type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeHandler(data: any): RestHandler {
  const url = urljoin(
    MOCK_ZUCONNECT_TRIPSHA_URL,
    "tickets",
    MOCK_ZUCONNECT_TRIPSHA_KEY
  );
  return rest.get(url, (req, res, ctx) => {
    return res(ctx.json(data));
  });
}

/**
 * Set up the default mock server.
 */
export function getZuconnectMockTripshaServer(): SetupServer {
  const server = setupServer(makeHandler(goodResponse));
  return server;
}
