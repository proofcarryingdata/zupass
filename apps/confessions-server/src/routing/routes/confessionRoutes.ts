import express, { Request, Response, NextFunction } from "express";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { ApplicationContext } from "../../types";
import { prisma } from "../../util/prisma";

export function initConfessionRoutes(
  app: express.Application,
  _context: ApplicationContext
): void {
  app.post("/confessions", async (req: Request, res: Response, next: NextFunction) => {
    const request = req.body as PostConfessionRequest;

    try {
      // verify confession proof
      const deserialized = await SemaphoreGroupPCDPackage.deserialize(
        request.proof
      );
      const verified = await SemaphoreGroupPCDPackage.verify(deserialized);
      if (!verified) {
        throw new Error("invalid proof");
      }

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
      console.error(e);
      next(e);
    }
  });

  app.get("/confessions", async (req: Request, res: Response) => {
    // TODO: only Zuzalu members can see the confessions???

    const page = queryStrToInt(
      req.query.page,
      1,
      (i: number) : boolean => { return i >= 1}
    );
    const limit = queryStrToInt(
      req.query.limit,
      20,
      (i: number) : boolean => { return i >= 1}
    );

    const confessions = await prisma.confession.findMany({
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { updatedAt: "desc" },
    });
    res.status(200).json({ confessions });
  });
}

export interface PostConfessionRequest {
  semaphoreGroupUrl: string;
  confession: string;
  proof: string;
}

function queryStrToInt(
  s: any,
  defaultValue: number,
  predicate?: (i: number) => boolean
): number {
  if (s == null || typeof s !== "string") return defaultValue;

  const parsed = parseInt(decodeURIComponent(s));
  if (isNaN(parsed)) return defaultValue;

  return ((predicate && !predicate(parsed))) ? defaultValue : parsed;
}
