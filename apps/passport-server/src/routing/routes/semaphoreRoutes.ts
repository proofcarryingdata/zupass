import { SemaphoreValidRootResponseValue } from "@pcd/passport-interface";
import {
  SerializedSemaphoreGroup,
  serializeSemaphoreGroup
} from "@pcd/semaphore-group-pcd";
import express, { Request, Response } from "express";
import { sqlTransaction } from "../../database/sqlQuery";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { checkUrlParam } from "../params";
import { PCDHTTPError } from "../pcdHttpError";

export function initSemaphoreRoutes(
  app: express.Application,
  context: ApplicationContext,
  { semaphoreService }: GlobalServices
): void {
  logger("[INIT] initializing semaphore routes");

  /**
   * We maintain semaphore groups of our users. Whenever a new Semaphore
   * identity is created on Zupass, we update the appropriate groups.
   * This route lets callers determine whether the given group ever had the
   * given root hash.
   *
   * @todo - should we turn this off for Devconnect/Zuconnect? could get expensive.
   * @todo - should we have a max age and delete really old roots?
   * @todo - write tests?
   */
  app.get(
    "/semaphore/valid-historic/:id/:root",
    async (req: Request, res: Response) => {
      const groupId = checkUrlParam(req, "id");
      const roothash = checkUrlParam(req, "root");

      const historicGroupValid = await sqlTransaction(
        context.dbPool,
        (client) =>
          semaphoreService.getHistoricSemaphoreGroupValid(
            client,
            groupId,
            roothash
          )
      );

      const result = {
        valid: historicGroupValid
      };

      res.json(result satisfies SemaphoreValidRootResponseValue);
    }
  );

  /**
   * Gets an old semaphore group by id and root hash from the database.
   *
   * Returns a 404 if it can't find the group.
   *
   * @todo - turn off?
   * @todo - write tests?
   */
  app.get(
    "/semaphore/historic/:id/:root",
    async (req: Request, res: Response) => {
      const historicGroup = await sqlTransaction(context.dbPool, (client) =>
        semaphoreService.getHistoricSemaphoreGroup(
          client,
          checkUrlParam(req, "id"),
          checkUrlParam(req, "root")
        )
      );

      if (!historicGroup) {
        throw new PCDHTTPError(404, "Semaphore group not found");
      }

      const result = JSON.parse(historicGroup.serializedGroup);

      res.json(result satisfies SerializedSemaphoreGroup);
    }
  );

  /**
   * Gets the latest root hash for the given semaphore group.
   *
   * If no group exists for the given id, returns a 404.
   *
   * @todo - turn off?
   * @todo - write tests?
   */
  app.get("/semaphore/latest-root/:id", async (req: Request, res: Response) => {
    const id = checkUrlParam(req, "id");
    const latestGroups = await sqlTransaction(context.dbPool, (client) =>
      semaphoreService.getLatestSemaphoreGroups(client)
    );
    const matchingGroup = latestGroups.find((g) => g.groupId.toString() === id);

    if (!matchingGroup) {
      throw new PCDHTTPError(404, "Semaphore group not found");
    }

    res.json(matchingGroup.rootHash satisfies string);
  });

  /**
   * Gets the latest Semaphore group for a given semaphore group id.
   *
   * If no group exists for the given id, returns a 404.
   *
   * @todo - turn off?
   * @todo - write tests?
   */
  app.get("/semaphore/:id", async (req: Request, res: Response) => {
    const semaphoreId = checkUrlParam(req, "id");
    const namedGroup = semaphoreService.getNamedGroup(semaphoreId);

    if (!namedGroup) {
      throw new PCDHTTPError(404, "Semaphore group not found");
    }

    const result = serializeSemaphoreGroup(namedGroup.group, namedGroup.name);

    res.json(result satisfies SerializedSemaphoreGroup);
  });
}
