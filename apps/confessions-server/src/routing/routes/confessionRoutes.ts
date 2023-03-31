import express, { Request, Response, NextFunction } from "express";
import { ApplicationContext } from "../../types";
import { prisma } from "../../util/prisma";

export function initConfessionRoutes(
  app: express.Application,
  _context: ApplicationContext
): void {
  app.post("/confessions", async (req: Request, res: Response, next: NextFunction) => {
    // TODO: verify confession proof
    // Check if already saved
    const request = req.body as PostConfessionRequest;
  
    try {
      await prisma.confession.create({
        data: {
          semaphoreGroupUrl: request.semaphoreGroupUrl,
          body: request.confession,
          proof: request.proof
        }
      });

      res.send("ok");
    } catch (e) {
      next(e);
    }
  });

  app.get("/confessions", async (req: Request, res: Response, next: NextFunction) => {
    // TODO: only Zuzalu memberrs can see the confessions?
    // TODO: paging

    const confessions = await prisma.confession.findMany();
    res.status(200).json({ confessions });
  });
}

export interface PostConfessionRequest {
  semaphoreGroupUrl: string;
  confession: string;
  proof: string;
}
