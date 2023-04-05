import express, { Request, Response, NextFunction } from "express";
import { sign } from "jsonwebtoken";
import {
  deserializeSemaphoreGroup,
  SemaphoreGroupPCDPackage,
  SerializedSemaphoreGroup
} from "@pcd/semaphore-group-pcd";
import { Group } from "@semaphore-protocol/group";
import { sha256 } from "js-sha256";
import { ApplicationContext } from "../../types";
import { SEMAPHORE_GROUP_URL, ACCESS_TOKEN_SECRET, authenticateJWT } from "../../util/auth";
import { prisma } from "../../util/prisma";

export function initConfessionRoutes(
  app: express.Application,
  _context: ApplicationContext
): void {
  // this endpoint verifies the proof is valid,
  // and the proof claim matches the semaphoreGroupUrl and the confession in the request
  // before saving the confession to the database.
  app.post("/confessions", async (req: Request, res: Response, next: NextFunction) => {
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

  // this login endpoint and the get confessions endpoint below shows how an auth flow could work.
  // this endpoint verfies the proof and returns a jwt if succeed.
  // the client can then use this jwt in its future requests.
  // the get confessions endpoint uses the middleware authenticateJWT to authenticate jwt.
  app.post("/login", async (req: Request, res: Response, next: NextFunction) => {
    const request = req.body as LoginRequest;

    try {
      const err = await verifyGroupProof(request.semaphoreGroupUrl, request.proof)
      if (err != null) throw err;

      const accessToken = sign({ groupUrl: request.semaphoreGroupUrl }, ACCESS_TOKEN_SECRET)

      res.status(200).json({ accessToken });
    } catch (e) {
      console.error(e);
      next(e);
    }
  });

  app.get("/confessions", authenticateJWT, async (req: Request, res: Response) => {
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

export interface LoginRequest {
  semaphoreGroupUrl: string;
  proof: string;
}

export interface PostConfessionRequest {
  semaphoreGroupUrl: string;
  confession: string;
  proof: string;
}

async function verifyGroupProof(
  semaphoreGroupUrl: string,
  proof: string,
  signal?: string
): Promise<Error | null> {
  // only allow Zuzalu group for now
  if (semaphoreGroupUrl !== SEMAPHORE_GROUP_URL) {
    return new Error("only Zuzalu group is allowed");
  }

  const pcd = await SemaphoreGroupPCDPackage.deserialize(
    proof
  );

  const verified = await SemaphoreGroupPCDPackage.verify(pcd);
  if (!verified) {
    return new Error("invalid proof");
  }

  // check semaphoreGoupUrl matches the claim
  const response = await fetch(semaphoreGroupUrl);
  const json = await response.text();
  const serializedGroup = JSON.parse(json) as SerializedSemaphoreGroup;
  const group = new Group(1, 16);
  group.addMembers(serializedGroup.members);
  if (deserializeSemaphoreGroup(pcd.claim.group).root.toString() !== group.root.toString()) {
    return new Error("semaphoreGroupUrl doesn't match claim group merkletree root")
  }

  if (signal &&
    pcd.claim.signal.toString() !== generateMessageHashStr(signal)) {
    throw new Error("signal doesn't match claim")
  }

  return null;
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
