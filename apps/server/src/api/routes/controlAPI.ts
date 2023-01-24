import express, { Request, Response } from "express";
import { Client } from "pg";
import { githubSync } from "../../githubSync/githubSync";

export function initControlRoutes(
  app: express.Application,
  client: Client
): void {
  console.log("Initializing control routes");

  app.get("/control/sync", async (req: Request, res: Response) => {
    githubSync().catch((e) => {
      console.error("[GITHUB] Failed to sync GitHub");
      console.error(e);
    });

    res.send("Started.");
  });
}
