import {
  AddUserEmailRequest,
  AgreeTermsRequest,
  ChangeUserEmailRequest,
  ConfirmEmailRequest,
  CreateNewUserRequest,
  DeleteAccountRequest,
  OneClickLoginRequest,
  RemoveUserEmailRequest,
  SaltResponseValue,
  VerifyTokenRequest
} from "@pcd/passport-interface";
import { normalizeEmail } from "@pcd/util";
import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { checkBody, checkQueryParam, checkUrlParam } from "../params";

export function initAccountRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { userService }: GlobalServices
): void {
  logger("[INIT] initializing account routes");

  /**
   * Gets the password salt for a given email address.
   *
   * Returns an instance of {@link SaltResponseValue} if no errors occurred.
   *
   * This route is not access-controlled in any way.
   *
   * @todo access-control?
   */
  app.get("/account/salt", async (req: Request, res: Response) => {
    const email = normalizeEmail(checkQueryParam(req, "email"));
    const salt = await userService.getSaltByEmail(email);
    res.send(salt satisfies SaltResponseValue);
  });

  /**
   * Step 1 of account creation on Zupass.
   *
   * If a user already exists with the given email address, and the `force` option
   * is not set to true, returns a 403 server error with the message
   * "<email address> already registered."
   *
   * If `force` *is* true, then calling this api creates and sends a new token to the
   * given email, which can be used in step 2 (/account/verify-token) to proceed
   * with account creation.
   *
   * If this is the first time this user is calling this route, then the `force`
   * parameter is not neccessary to set to `true`.
   *
   * In development mode the server can be configured to bypass sending an actual
   * email (check out the .env.local.example file for more details). If that is
   * the case, then this route returns the token directly from this route, so that
   * the client can auto-plug-it-in for the user (or, rather, the developer: me).
   * The token is encoded in an {@link ConfirmEmailResponseValue}.
   *
   * In the case that an email *was* successfully sent, just returns a 200 OK.
   */
  app.post("/account/send-login-email", async (req: Request, res: Response) => {
    const email = normalizeEmail(
      checkBody<ConfirmEmailRequest, "email">(req, "email")
    );
    const commitment = checkBody<ConfirmEmailRequest, "commitment">(
      req,
      "commitment"
    );
    const force =
      checkBody<ConfirmEmailRequest, "force">(req, "force") === "true";

    await userService.handleSendTokenEmail(email, commitment, force, res);
  });

  /**
   * Step 2 of account creation.
   *
   * If the token is valid, returns a 200 OK.
   *
   * If the token is invalid, returns a 403 error.
   */
  app.post("/account/verify-token", async (req: Request, res: Response) => {
    const token = checkBody<VerifyTokenRequest, "token">(req, "token");
    const email = checkBody<VerifyTokenRequest, "email">(req, "email");

    const result = await userService.handleVerifyToken(token, email);

    res.status(200).json(result);
  });

  app.post("/account/one-click-login", async (req: Request, res: Response) => {
    const email = checkBody<OneClickLoginRequest, "email">(req, "email");
    const code = checkBody<OneClickLoginRequest, "code">(req, "code");
    const commitment = checkBody<OneClickLoginRequest, "commitment">(
      req,
      "commitment"
    );
    const encryptionKey = checkBody<OneClickLoginRequest, "encryptionKey">(
      req,
      "encryptionKey"
    );

    await userService.handleOneClickLogin(
      email,
      code,
      commitment,
      encryptionKey,
      res
    );
  });

  /**
   * Step 3 of account creation.
   *
   * Creates a new Zupass user. The user must call this route with the token
   * they received in their email. They must also upload the public component
   * of their semaphore identity (via the `commitment` parameter), as well as
   * the `salt` their Zupass client generated for them, so that they can use
   * it again later on. Finally, they must also include the token they got in
   * their email inbox (or via the `devToken` feature described in the comment
   * of the /account/send-login-email route).
   *
   * If the token is incorrect, returns a 403 server error.
   *
   * If the token *is* correct, proceeds with user creation.
   *
   * Creating a user overwrites important user data, like their salt and semaphore
   * commitment. In the case a user already existed for this email, this route
   * is effectively an 'account reset' feature.
   *
   * In the successful case, returns a {@link ZupassUserJson}.
   */
  app.post("/account/new-participant", async (req: Request, res: Response) => {
    const email = normalizeEmail(
      checkBody<CreateNewUserRequest, "email">(req, "email")
    );
    const { salt, encryptionKey, autoRegister } =
      req.body as CreateNewUserRequest as CreateNewUserRequest;
    const token = checkBody<CreateNewUserRequest, "token">(req, "token");
    const commitment = checkBody<CreateNewUserRequest, "commitment">(
      req,
      "commitment"
    );

    await userService.handleNewUser(
      token,
      email,
      commitment,
      salt,
      encryptionKey,
      autoRegister,
      res
    );
  });

  /**
   * Records that the user has agreed to a given version of the legal terms.
   */
  app.post("/account/agree-terms", async (req: Request, res: Response) => {
    const pcd = checkBody<AgreeTermsRequest, "pcd">(req, "pcd");

    const result = await userService.handleAgreeTerms(pcd);

    if (result.success) {
      res.status(200).json(result.value);
    } else {
      res.status(403).send(result.error);
    }
  });

  /**
   * Gets a Zupass user by their uuid.
   * If the service is not ready, returns a 503 server error.
   * If the user does not exist, returns a 404.
   * Otherwise returns the user as a {@link ZupassUserJson}
   *
   * @todo - should we censor part of this unless you're the given user? eg.
   * should we be returning the `salt` here?
   */
  app.get("/account/user/:uuid", async (req: Request, res: Response) => {
    await userService.handleGetUser(checkUrlParam(req, "uuid"), res);
  });

  /**
   * temporary, for backwards compat; same as /account/user/:uuid
   */
  app.get("/pcdpass/participant/:uuid", async (req: Request, res: Response) => {
    await userService.handleGetUser(checkUrlParam(req, "uuid"), res);
  });

  /**
   * temporary, for backwards compat; same as /account/user/:uuid
   */
  app.get("/zuzalu/participant/:uuid", async (req: Request, res: Response) => {
    await userService.handleGetUser(checkUrlParam(req, "uuid"), res);
  });

  app.post("/account/delete", async (req: Request, res: Response) => {
    const pcd = checkBody<DeleteAccountRequest, "pcd">(req, "pcd");
    await userService.handleDeleteAccount(pcd);
    res.sendStatus(200);
  });

  /**
   * Adds a new email address to a user's account.
   */
  app.post("/account/add-email", async (req: Request, res: Response) => {
    const newEmail = checkBody<AddUserEmailRequest, "newEmail">(req, "newEmail")
      .trim()
      .toLocaleLowerCase();
    const pcd = checkBody<AddUserEmailRequest, "pcd">(req, "pcd");
    const confirmationCode = req.body.confirmationCode as string | undefined;

    const result = await userService.handleAddUserEmail(
      newEmail,
      pcd,
      confirmationCode
    );

    res.status(200).json(result);
  });

  /**
   * Removes an email address from a user's account.
   */
  app.post("/account/delete-email", async (req: Request, res: Response) => {
    const emailToRemove = checkBody<RemoveUserEmailRequest, "emailToRemove">(
      req,
      "emailToRemove"
    )
      .trim()
      .toLocaleLowerCase();
    const pcd = checkBody<RemoveUserEmailRequest, "pcd">(req, "pcd");

    const result = await userService.handleRemoveUserEmail(emailToRemove, pcd);

    res.status(200).json(result);
  });

  /**
   * Changes a user's email address.
   */
  app.post("/account/change-email", async (req: Request, res: Response) => {
    const oldEmail = checkBody<ChangeUserEmailRequest, "oldEmail">(
      req,
      "oldEmail"
    )
      .trim()
      .toLocaleLowerCase();
    const newEmail = checkBody<ChangeUserEmailRequest, "newEmail">(
      req,
      "newEmail"
    )
      .trim()
      .toLocaleLowerCase();
    const pcd = checkBody<ChangeUserEmailRequest, "pcd">(req, "pcd");
    const confirmationCode = req.body.confirmationCode as string | undefined;

    const result = await userService.handleChangeUserEmail(
      oldEmail,
      newEmail,
      pcd,
      confirmationCode
    );

    res.status(200).send(result);
  });
}
