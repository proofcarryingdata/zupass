import express, { Request, Response } from "express";
import { ApplicationContext } from "../../types";

export function initPCDRoutes(
  app: express.Application,
  context: ApplicationContext
): void {
  app.post("/pcds/prove", async (req: Request, res: Response) => {
    res.send("PCD Passport Server - OK!");
  });

  app.post("/pcds/verify", async (req: Request, res: Response) => {
    res.send("PCD Passport Server - OK!");
  });

  app.get("/pcds/supported", async (req: Request, res: Response) => {
    res.send("PCD Passport Server - OK!");
  });
}
