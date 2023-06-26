import express, { Request, Response } from "express";
import { ApplicationContext } from "../../types";

export function initPCDPassRoutes(
  app: express.Application,
  context: ApplicationContext
) {
  app.get("/pcdpass/", (req: Request, res: Response) => {
    res.send("ok");
  });
}
