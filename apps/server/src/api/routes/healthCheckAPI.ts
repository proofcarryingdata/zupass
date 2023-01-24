import express, { Request, Response } from "express";
import { Client } from "pg";

export function initHealthcheckRoutes(
  app: express.Application,
  client: Client
): void {
  console.log("Initializing health check routes");

  app.get("/", (req: Request, res: Response) => {
    res.send("OK!");
  });
}
