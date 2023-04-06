import express, { Request, Response, NextFunction } from "express";
import { ApplicationContext } from "../../types";
import { verifyGroupProof } from "../../util/verify";
import { prisma } from "../../util/prisma";

/**
 * The endpoints in this function accepts proof (pcd) in the request.
 * It verifies the proof before proceed. So in this case no other type of auth (e.g. jwt)
 * is needed.
 */
export function initPCDRoutes(
  app: express.Application,
  _context: ApplicationContext
): void {
  app.post("/new-confession", async (req: Request, res: Response, next: NextFunction) => {
    const request = req.body as PostConfessionRequest;

    try {
     const err = await verifyGroupProof(request.semaphoreGroupUrl, request.proof, request.confession)
     if (err != null) throw err;

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
}

export interface PostConfessionRequest {
  semaphoreGroupUrl: string;
  confession: string;
  proof: string;
}
