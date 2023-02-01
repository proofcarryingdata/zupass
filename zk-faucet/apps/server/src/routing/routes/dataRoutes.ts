import express, { Request, Response } from "express";
import { getRepositories } from "../../database/readwrite/repositories";
import { ApplicationContext } from "../../types";

export function initDataRoutes(
  app: express.Application,
  context: ApplicationContext
): void {
  console.log("[INIT] Initializing data routes");

  app.get("/data/repositories", async (req: Request, res: Response) => {
    const repositories = await getRepositories(context.dbClient);
    res.json(repositories);
  });
}
