import {
  ConfirmEmailRequest,
  CreateNewUserRequest
} from "@pcd/passport-interface";
import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { normalizeEmail } from "../../util/util";
import { checkBody, checkUrlParam } from "../params";

export function initZuzaluRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { userService }: GlobalServices
): void {
  logger("[INIT] initializing zuzalu routes");

  /**
   * To be deprecated soon!
   *
   * Lets Zuzalu ticket holders (as designated by the original
   * Zuzalu Pretix instance) send themselves an email with a confirmation code
   * which they can plug into the client to continue logging into Zupass.org.
   *
   * @todo - delete this.
   * @todo - rate limit?
   */
  app.post("/zuzalu/send-login-email", async (req: Request, res: Response) => {
    const email = normalizeEmail(
      checkBody<ConfirmEmailRequest, "email">(req, "email")
    );
    const commitment = checkBody<ConfirmEmailRequest, "commitment">(
      req,
      "commitment"
    );
    const force =
      checkBody<ConfirmEmailRequest, "force">(req, "force") === "true";

    await userService.handleSendZuzaluEmail(email, commitment, force, res);
  });

  /**
   * To be deprecated soon!
   *
   * Given a confirmation code, lets a user create/overwrite their user details
   * on zupass.org.
   *
   * 403 on access control error.
   *
   * @todo - delete this.
   * @todo - rate limit?
   */
  app.post("/zuzalu/new-participant", async (req: Request, res: Response) => {
    const token = checkBody<CreateNewUserRequest, "token">(req, "token");
    const email = checkBody<CreateNewUserRequest, "email">(req, "email");
    const commitment = checkBody<CreateNewUserRequest, "commitment">(
      req,
      "commitment"
    );

    await userService.handleNewZuzaluUser(token, email, commitment, res);
  });

  /**
   * To be deprecated soon!
   *
   * Fetch a specific zuzalu user, given their public semaphore commitment.
   *
   * 404 if the user can't be found.
   *
   * 503 if we're not ready to respond yet.
   *
   * @todo - delete this.
   * @todo - rate limit?
   */
  app.get("/zuzalu/participant/:uuid", async (req: Request, res: Response) => {
    await userService.handleGetZuzaluUser(checkUrlParam(req, "uuid"), res);
  });
}
