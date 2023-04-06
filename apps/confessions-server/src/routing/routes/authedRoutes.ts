import express, { Request, Response, NextFunction } from "express";
import { sign } from "jsonwebtoken";
import { ApplicationContext } from "../../types";
import { ACCESS_TOKEN_SECRET, authenticateJWT } from "../../util/auth";
import { verifyGroupProof } from "../../util/verify";
import { prisma } from "../../util/prisma";

/**
 * The routes in this function shows how an auth flow would work.
 * The client can call /login with a semaphore group proof, once the proof is verified, it will return
 * an jwt. The client can then use this jwt in future requests to this server.
 * The /confessions endpoint shows how to authenticate the jwt with the middleware authenticateJWT.
 */
export function initAuthedRoutes(
  app: express.Application,
  _context: ApplicationContext
): void {
  app.post("/login", async (req: Request, res: Response, next: NextFunction) => {
    const request = req.body as LoginRequest;

    try {
      const err = await verifyGroupProof(request.semaphoreGroupUrl, request.proof)
      if (err != null) throw err;

      const accessToken = sign({ groupUrl: request.semaphoreGroupUrl }, ACCESS_TOKEN_SECRET!)

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
