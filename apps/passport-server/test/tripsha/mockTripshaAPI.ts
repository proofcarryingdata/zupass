import { RestHandler, rest } from "msw";
import { SetupServer, setupServer } from "msw/node";

export const MOCK_ZUCONNECT_TRIPSHA_URL = "http://tripsha.example.com";

// An empty response
export const badEmptyResponse = {};

// A response with a faulty ticket.
export const badTicketsResponse = {
  tickets: [
    {
      id: "65012572b5f4a42c66422b9f",
      type: "ZuConnect Resident Pass",
      // Ticket has no email address
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
      type: "ZuConnect Resident Pass",
      email: "test1@example.com",
      first: "Test",
      last: "One"
    },
    {
      id: "6501284fb5f4a42c66426353",
      type: "ZuConnect Resident Pass",
      email: "test2@example.com",
      first: "Test",
      last: "Two"
    },
    {
      id: "65018334b5f4a42c6648d4e2",
      type: "ZuConnect Resident Pass",
      email: "test3@example.com",
      first: "Test",
      last: "Three"
    },
    {
      id: "65018a79b5f4a42c6649604d",
      type: "ZuConnect Resident Pass",
      email: "test4@example.com",
      first: "Test",
      last: "Four"
    },
    {
      id: "6501996fb5f4a42c664a8626",
      type: "ZuConnect Resident Pass",
      email: "test5@example.com",
      first: "Test",
      last: "Five"
    }
  ]
};

/**
 * Make a mock handler for a given sample response.
 */
export function makeHandler(data: any): RestHandler {
  return rest.get(`${MOCK_ZUCONNECT_TRIPSHA_URL}/tickets`, (req, res, ctx) => {
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
