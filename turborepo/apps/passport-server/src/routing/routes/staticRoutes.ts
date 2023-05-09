import express from "express";
import * as path from "path";
import { ApplicationContext } from "../../types";

const staticResourcesPath = path.resolve(
  path.join(__dirname, "../../../public")
);
const semaphoreResourcesPath = path.join(
  staticResourcesPath,
  "semaphore-artifacts"
);

export function initStaticRoutes(
  app: express.Application,
  _context: ApplicationContext
): void {
  console.log("[INIT] Initializing static routes");

  app.use(
    "/static",
    express.static(staticResourcesPath, {
      setHeaders(res, path, _stat) {
        if (path.startsWith(semaphoreResourcesPath)) {
          res.setHeader("Cache-Control", "max-age=31536000"); // one year
        }
      },
    })
  );
}
