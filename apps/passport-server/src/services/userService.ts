import { ParticipantRole, ZuParticipant } from "@pcd/passport-interface";
import { Response } from "express";
import next from "next";
import { fetchPretixParticipant } from "../database/queries/pretix_users/fetchPretixParticipant";
import { insertPretixParticipant } from "../database/queries/pretix_users/insertParticipant";
import { insertCommitment } from "../database/queries/saveCommitment";
import { insertEmailToken } from "../database/queries/setEmailToken";
import { ApplicationContext } from "../types";
import { sendPretixEmail } from "../util/email";
import { generateEmailToken } from "../util/util";
import { SemaphoreService } from "./semaphoreService";

export class UserService {
  context: ApplicationContext;
  semaphoreService: SemaphoreService;

  public constructor(
    context: ApplicationContext,
    semaphoreService: SemaphoreService
  ) {
    this.context = context;
    this.semaphoreService = semaphoreService;
  }

  public async handleSendZuzaluEmail(
    email: string,
    commitment: string,
    force: boolean,
    response: Response
  ) {
    console.log(
      `[ZUID] send-login-email ${JSON.stringify({ email, commitment, force })}`
    );

    const { dbPool } = this.context;

    const token = generateEmailToken();

    // Save the token. This lets the user prove access to their email later.
    const devBypassEmail =
      process.env.BYPASS_EMAIL_REGISTRATION === "true" &&
      process.env.NODE_ENV !== "production";
    if (devBypassEmail) {
      await insertPretixParticipant(dbPool, {
        email: email,
        name: "Test User",
        order_id: "",
        residence: "atlantis",
        role: ParticipantRole.Resident,
        visitor_date_ranges: undefined,
      });
    }

    await insertEmailToken(dbPool, { email, token });
    const participant = await fetchPretixParticipant(dbPool, { email });

    if (participant == null) {
      throw new Error(`${email} doesn't have a ticket.`);
    } else if (
      participant.commitment != null &&
      participant.commitment !== commitment &&
      !force
    ) {
      throw new Error(`${email} already registered.`);
    }
    const stat = participant.commitment == null ? "NEW" : "EXISTING";
    console.log(
      `Saved login token for ${stat} email=${email} commitment=${commitment}`
    );

    // Send an email with the login token.
    if (devBypassEmail) {
      console.log("[DEV] Bypassing email, returning token");

      response.json({ token });
    } else {
      const { name } = participant;
      console.log(
        `[ZUID] Sending token=${token} to email=${email} name=${name}`
      );
      await sendPretixEmail(this.context, email, name, token);

      response.sendStatus(200);
    }
  }

  public async handleNewZuzaluParticipant(
    emailToken: string,
    email: string,
    commitment: string,
    res: Response
  ) {
    const { dbPool } = this.context;
    console.log(
      `[ZUID] new-participant ${JSON.stringify({
        emailToken,
        email,
        commitment,
      })}`
    );

    try {
      const pretix = await fetchPretixParticipant(dbPool, { email });
      if (pretix == null) {
        throw new Error(`Ticket for ${email} not found`);
      } else if (pretix.token !== emailToken) {
        throw new Error(
          `Wrong token. If you got more than one email, use the latest one.`
        );
      } else if (pretix.email !== email) {
        throw new Error(`Email mismatch.`);
      }

      // Save commitment to DB.
      console.log(`[ZUID] Saving new commitment: ${commitment}`);
      const uuid = await insertCommitment(dbPool, {
        email,
        commitment,
      });

      // Reload Merkle trees
      await this.semaphoreService.reload();
      const participant = this.semaphoreService.getParticipant(uuid);
      if (participant == null) {
        throw new Error(`${uuid} not found`);
      } else if (participant.commitment !== commitment) {
        throw new Error(`Commitment mismatch`);
      }

      // Return participant, including UUID, back to Passport
      const zuParticipant = participant as ZuParticipant;
      const jsonP = JSON.stringify(zuParticipant);
      console.log(`[ZUID] Added new Zuzalu participant: ${jsonP}`);

      res.json(zuParticipant);
    } catch (e: any) {
      e.message = "Can't add Zuzalu Passport: " + e.message;
      next(e);
    }
  }

  public async handleGetZuzaluParticipant(uuid: string, res: Response) {
    console.log(`[ZUID] Fetching participant ${uuid}`);
    const participant = this.semaphoreService.getParticipant(uuid);
    if (!participant) res.status(404);
    res.json(participant || null);
  }
}

export function startUserService(
  context: ApplicationContext,
  semaphoreService: SemaphoreService
): UserService {
  const userService = new UserService(context, semaphoreService);
  return userService;
}
