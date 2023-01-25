import express, { Request, Response } from "express";
import { ApplicationContext } from "../../types";

export function initHealthcheckRoutes(
  app: express.Application,
  context: ApplicationContext
): void {
  console.log("Initializing health check routes");

  app.get("/", async (req: Request, res: Response) => {
    res.send("OK!");
  });
}
