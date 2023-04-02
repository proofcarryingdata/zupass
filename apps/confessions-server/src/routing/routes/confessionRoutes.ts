import express, { Request, Response, NextFunction } from "express";
import {
  SemaphoreGroupPCDPackage,
  SerializedSemaphoreGroup
} from "@pcd/semaphore-group-pcd";
import { Group } from "@semaphore-protocol/group";
import { sha256 } from "js-sha256";
import { ApplicationContext } from "../../types";
import { prisma } from "../../util/prisma";
import { IS_PROD } from "../../util/isProd";

const SEMAPHORE_GROUP_URL = IS_PROD
  ? "https://api.pcd-passport.com/semaphore/1"
  : "http://localhost:3002/semaphore/1";

export function initConfessionRoutes(
  app: express.Application,
  _context: ApplicationContext
): void {
  app.post("/confessions", async (req: Request, res: Response, next: NextFunction) => {
    const request = req.body as PostConfessionRequest;

    try {
      // only allow Zuzalu group for now
      if (request.semaphoreGroupUrl !== SEMAPHORE_GROUP_URL) {
        throw new Error("only Zuzalu group is allowed");
      }

      // verify confession proof
      const pcd = await SemaphoreGroupPCDPackage.deserialize(
        request.proof
      );

      const verified = await SemaphoreGroupPCDPackage.verify(pcd);
      if (!verified) {
        throw new Error("invalid proof");
      }

      // check semaphoreGoupUrl and confession in the request matches the proof
      const response = await fetch(request.semaphoreGroupUrl);
      const json = await response.text();
      const serializedGroup = JSON.parse(json) as SerializedSemaphoreGroup;
      const group = new Group(1, 16);
      group.addMembers(serializedGroup.members);
      if (pcd.proof.proof.merkleTreeRoot !== group.root.toString()) {
        throw new Error("semaphoreGroupUrl doesn't match proof merkleTreeRoot")
      }

      if (pcd.claim.signal.toString() !== generateMessageHashStr(request.confession)) {
        throw new Error("confession doesn't match proof signal")
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

function generateMessageHashStr(message: string): string {
  return (BigInt("0x" + sha256(message)) >> BigInt(8)).toString();
}
