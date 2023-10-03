import { ApplicationContext } from "../types";

export class AuthService {
  private readonly context: ApplicationContext;

  public constructor(context: ApplicationContext) {
    this.context = context;
  }
}

export function startAuthService(context: ApplicationContext): AuthService {
  return new AuthService(context);
}
