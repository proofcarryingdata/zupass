import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { EmailService } from "./emailService";

const LOG_TAG = "[BulkEmailService]";

export class BulkEmailService {
  private readonly emailService: EmailService;
  private readonly context: ApplicationContext;

  public constructor(context: ApplicationContext, emailService: EmailService) {
    this.context = context;
    this.emailService = emailService;
  }

  public start() {
    logger(LOG_TAG, "starting");
  }

  public stop() {
    logger(LOG_TAG, "stopping");
  }
}

export function startBulkEmailService(
  context: ApplicationContext,
  emailService: EmailService
) {
  logger("[INIT] creating bulk email service");
  const bulkEmailService = new BulkEmailService(context, emailService);
  bulkEmailService.start();
  return bulkEmailService;
}
