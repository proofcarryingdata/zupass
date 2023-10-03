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

  public jwtParserMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const jwt = this.getJWT(req);

    next();
  };

  private createJWTContents(email: string): JWTContents {
    return {
      data: {
        email
      }
    };
  }

  public createUserJWT(email: string): string {
    const contents = this.createJWTContents(email);
    const token = jwt.sign(contents, secret, { algorithm: "HS256" });
    return token;
  }

  public getJWT(req: Request): JWTContents | null {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger("[JWT] no auth header");
      return null;
    }

    try {
      const value = jwt.verify(authHeader, secret) as JWTContents;
      logger("[JWT] valid jwt", value);
      return value;
    } catch (e) {
      logger("[JWT] invalid jwt", e);
      return null;
    }
  }
}

export function startAuthService(context: ApplicationContext): AuthService {
  return new AuthService(context);
}
