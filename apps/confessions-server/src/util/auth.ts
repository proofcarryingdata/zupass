import { Request, Response, NextFunction } from "express";
import { verify, JwtPayload } from "jsonwebtoken";
import { IS_PROD } from "./isProd";

export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "secret";

export const SEMAPHORE_GROUP_URL = IS_PROD
  ? "https://api.pcd-passport.com/semaphore/1"
  : "http://localhost:3002/semaphore/1";

export interface GroupJwtPayload extends JwtPayload {
  groupUrl: string
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    verify(token, ACCESS_TOKEN_SECRET, (err, group) => {
      if (err) {
        return res.sendStatus(403);
      }

      const payload = group as GroupJwtPayload;
      if (payload.groupUrl !== SEMAPHORE_GROUP_URL) {
          return res.sendStatus(403);
      }

      next();
    });
  } else {
    res.sendStatus(401);
  }
}