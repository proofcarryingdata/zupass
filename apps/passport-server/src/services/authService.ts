import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";

const secret = "shared secret";

export interface JWTContents {
  data: {
    email: string;
  };
}

export class AuthService {
  private readonly context: ApplicationContext;

  public constructor(context: ApplicationContext) {
    this.context = context;
  }

  public parseJWTMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (req.method.toLowerCase() !== "options") {
      req.jwt = this.getJWTFromRequest(req);
    }

    next();
  };

  public requireJWTAuthMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (req.jwt != null) {
      next();
    }

    next(new Error("authorization required for this route"));
  };

  public createUserJWT(email: string): string {
    const token = jwt.sign(
      {
        data: {
          email
        }
      } satisfies JWTContents,
      secret,
      { algorithm: "HS256" }
    );
    return token;
  }

  private getJWTFromRequest(req: Request): JWTContents | null {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger("[JWT] no auth header", req.method, req.path);
      return null;
    }

    try {
      const value = jwt.verify(authHeader, secret) as JWTContents;
      logger("[JWT] valid jwt", value, "PATH:", req.path);
      return value;
    } catch (e) {
      logger("[JWT] invalid jwt", e, "PATH:", req.path);
      return null;
    }
  }
}

export function startAuthService(context: ApplicationContext): AuthService {
  return new AuthService(context);
}
