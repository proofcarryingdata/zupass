import express, { Request, Response } from "express";
import { Client } from "pg";
import { getRepositories } from "../../database/readwrite/repositories";

export function initDataRoutes(app: express.Application, client: Client): void {
  console.log("Initializing data routes");

  app.get("/data/repositories", async (req: Request, res: Response) => {
    const repositories = await getRepositories(client);
    res.json(repositories);
  });
}
