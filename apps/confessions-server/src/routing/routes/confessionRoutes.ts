import express, { Request, Response, NextFunction } from "express";
import { ApplicationContext } from "../../types";
import { prisma } from "../../util/prisma";

export function initConfessionRoutes(
  app: express.Application,
  _context: ApplicationContext
): void {
  app.post("/confessions", async (req: Request, res: Response, next: NextFunction) => {
    // TODO: verify confession proof
    const request = req.body as PostConfessionRequest;
  
    try {
      // proof should be unique
      await prisma.confession.upsert({
        where: {
          proof: request.proof
        },
        update: {},
        create: {
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
