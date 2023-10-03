import { JWTContents } from "../../services/authService";

declare global {
  namespace Express {
    export interface Request {
      jwt?: JWTContents | null | undefined;
    }
  }
}
