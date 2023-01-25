import express, { Request, Response } from "express";
import { githubSync } from "../../services/githubSync";
import { ApplicationContext } from "../../types";

export function initControlRoutes(
  app: express.Application,
  context: ApplicationContext
): void {
  console.log("Initializing control routes");

  app.get("/control/sync", async (req: Request, res: Response) => {
    githubSync().catch((e) => {
      console.error("[GITHUB] Failed to sync GitHub");
      console.error(e);
    });

    res.send("Started Sync Process");
  });
}
