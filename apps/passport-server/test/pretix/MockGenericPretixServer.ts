import { GenericPretixPosition } from "@pcd/passport-interface";
import { RequestHandler, rest } from "msw";
import { GenericPretixDataMocker } from "./GenericPretixDataMocker";

export function getMockGenericPretixHandlers(
  orgs: IterableIterator<string>,
  mocker: GenericPretixDataMocker
): RequestHandler[] {
  const handlers = [];

  for (const orgUrl of orgs) {
    handlers.push(
      rest.get(orgUrl + "/events", (req, res, ctx) => {
        const org = mocker.getOrgByUrl(orgUrl);
        return res(
          ctx.json({ results: [...org.eventsByEventID.values()], next: null })
        );
      })
    );

    handlers.push(
      rest.get(orgUrl + "/events/:event", (req, res, ctx) => {
        const org = mocker.getOrgByUrl(orgUrl);
        const event = org.eventsByEventID.get(req.params.event as string);
        if (!event) {
          return res(ctx.status(404));
        }
        return res(ctx.json(event));
      })
    );

    handlers.push(
      rest.get(orgUrl + "/events/:event/items", (req, res, ctx) => {
        const org = mocker.getOrgByUrl(orgUrl);
        const items =
          org.productsByEventID.get(req.params.event as string) ?? [];
        return res(ctx.json({ results: items, next: null }));
      })
    );

    handlers.push(
      rest.get(orgUrl + "/events/:event/orders", (req, res, ctx) => {
        const org = mocker.getOrgByUrl(orgUrl);
        const orders =
          org.ordersByEventID.get(req.params.event as string) ?? [];
        return res(ctx.json({ results: orders, next: null }));
      })
    );

    handlers.push(
      rest.get(orgUrl + "/events/:event/categories", (req, res, ctx) => {
        const org = mocker.getOrgByUrl(orgUrl);
        const categories =
          org.productCategoriesByEventID.get(req.params.event as string) ?? [];
        return res(ctx.json({ results: categories, next: null }));
      })
    );

    handlers.push(
      rest.get(orgUrl + "/events/:event/settings", (req, res, ctx) => {
        const org = mocker.getOrgByUrl(orgUrl);
        const settings = org.settingsByEventID.get(req.params.event as string);
        return res(ctx.json(settings));
      })
    );

    handlers.push(
      rest.get(orgUrl + "/events/:event/checkinlists", (req, res, ctx) => {
        return res(
          ctx.json({ results: [{ id: 1, name: "Test" }], next: null })
        );
      })
    );

    handlers.push(
      rest.post(orgUrl + "/checkinrpc/redeem", async (req, res, ctx) => {
        const body = new Map(Object.entries(await req.json()));
        if (
          !body.has("secret") ||
          !body.has("lists") ||
          typeof body.get("secret") !== "string" ||
          !Array.isArray(body.get("lists"))
        ) {
          return res(ctx.status(400), ctx.json({}));
        }

        let checkedIn = false;
        mocker.updatePositionBySecret(
          orgUrl,
          body.get("secret") as string,
          (position: GenericPretixPosition) => {
            if (position.checkins.length === 0) {
              position.checkins.push({
                type: "entry",
                datetime: new Date().toISOString()
              });
              checkedIn = true;
            }
          }
        );

        if (checkedIn) {
          return res(ctx.json({ status: "ok" }));
        } else {
          return res(ctx.status(400), ctx.json({}));
        }
      })
    );
  }

  return handlers;
}
