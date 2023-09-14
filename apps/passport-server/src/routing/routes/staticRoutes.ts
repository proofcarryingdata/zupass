import express from "express";
import * as path from "path";
import { ApplicationContext } from "../../types";
import { logger } from "../../util/logger";

export function initStaticRoutes(
  app: express.Application,
  context: ApplicationContext
): void {
  logger("[INIT] initializing static content routes");

  const semaphoreResourcesPath = path.join(
    context.publicResourcesDir,
    "semaphore-artifacts"
  );

  /**
   * We serve static assets out of the 'apps/passport-server/public' directory.
   */
  app.use(
    "/static",
    express.static(context.publicResourcesDir, {
      setHeaders(res, path, _stat) {
        if (path.startsWith(semaphoreResourcesPath)) {
          res.setHeader("Cache-Control", "max-age=31536000"); // one year
        }
      }
    })
  );
}
