import express, { Request, Response } from "express";
import { ApplicationContext } from "../../types";

export function initZuzaluRoutes(
  app: express.Application,
  context: ApplicationContext
): void {
  console.log("[INIT] Initializing health check routes");

  app.get("/zuzalu/new-participant", async (req: Request, res: Response) => {
    const redir = req.query.redir;
    const token = req.query.token;
    const email = req.query.email;
    const member = req.query.member;

    console.log(req.query);

    res.send("new participant");
  });

  app.get("/semaphore/:id", async (req: Request, res: Response) => {
    const semaphoreId = req.params.id;
    console.log(req.params);
    res.send("semaphore id");
  });
}
