import { RestRequest, rest } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { IMockDevconnectPretixData } from "./devconnectPretixDataMocker";

function getAuthToken(req: RestRequest): string | undefined {
  return req.headers.get("Authorization")?.split(" ")[1];
}

export function getDevconnectMockPretixAPIServer(
  mockData: IMockDevconnectPretixData
): SetupServer {
  const handlers = [];

  for (const [orgUrl, org] of mockData.organizersByOrgUrl) {
    handlers.push(
      rest.get(orgUrl + "/events", (req, res, ctx) => {
        if (getAuthToken(req) !== org.token) {
          return res(ctx.status(403), ctx.text("Invalid token"));
        }
        return res(
          ctx.json({ results: [...org.eventByEventID.values()], next: null })
        );
      })
    );

    handlers.push(
      rest.get(orgUrl + "/events/:event", (req, res, ctx) => {
        if (getAuthToken(req) !== org.token) {
          return res(ctx.status(403), ctx.text("Invalid token"));
        }
        const event = org.eventByEventID.get(req.params.event as string);
        if (!event) {
          return res(ctx.status(404));
        }
        return res(ctx.json(event));
      })
    );

    handlers.push(
      rest.get(orgUrl + "/events/:event/items", (req, res, ctx) => {
        if (getAuthToken(req) !== org.token) {
          return res(ctx.status(403), ctx.text("Invalid token"));
        }
        const items = org.itemsByEventID.get(req.params.event as string) ?? [];
        return res(ctx.json({ results: items, next: null }));
      })
    );

    handlers.push(
      rest.get(orgUrl + "/events/:event/orders", (req, res, ctx) => {
        if (getAuthToken(req) !== org.token) {
          return res(ctx.status(403), ctx.text("Invalid token"));
        }
        const orders =
          org.ordersByEventID.get(req.params.event as string) ?? [];
        return res(ctx.json({ results: orders, next: null }));
      })
    );

    handlers.push(
      rest.get(orgUrl + "/events/:event/settings", (req, res, ctx) => {
        if (getAuthToken(req) !== org.token) {
          return res(ctx.status(403), ctx.text("Invalid token"));
        }
        const settings = org.settingsByEventID.get(req.params.event as string);
        return res(ctx.json(settings));
      })
    );
  }

  const server = setupServer(...handlers);

  return server;
}
