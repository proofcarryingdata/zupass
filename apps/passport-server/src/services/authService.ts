import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ApplicationContext } from "../types";

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
}

export function startAuthService(context: ApplicationContext): AuthService {
  return new AuthService(context);
}
