import { ApplicationContext } from "../../types";
import { logger } from "../../util/logger";
import { EmailService } from "../emailService";
import { RollbarService } from "../rollbarService";
import { traced } from "../telemetryService";
import { EmailTaskDefinition } from "./emailTask";
import { ADMIN_HELLO_EMAIL } from "./emails/1_admin_hello";

const SVC_NAME = "BulkEmailService";
const LOG_TAG = `[${SVC_NAME}]`;

export class BulkEmailService {
  private readonly emailService: EmailService;
  private readonly context: ApplicationContext;
  private readonly rollbarService: RollbarService;
  private readonly emailTasks: readonly EmailTaskDefinition[];
  private evaluationTimeoutHandle: NodeJS.Timer | undefined;
  private readonly evaluationIntervalMs: number = 60_000;

  public constructor(
    context: ApplicationContext,
    emailService: EmailService,
    rollbarService: RollbarService,
    emailTasks: readonly EmailTaskDefinition[]
  ) {
    this.context = context;
    this.emailService = emailService;
    this.rollbarService = rollbarService;
    this.emailTasks = emailTasks;
  }

  public start() {
    logger(LOG_TAG, "starting...");
    this.startEvaluationLoop();
  }

  public stop() {
    logger(LOG_TAG, "stopping...");
    if (this.evaluationTimeoutHandle) {
      clearTimeout(this.evaluationTimeoutHandle);
    }
  }

  private async startEvaluationLoop(): Promise<void> {
    try {
      await this.evaluateBulkEmailTasks();
    } finally {
      setTimeout(
        this.startEvaluationLoop.bind(this),
        this.evaluationIntervalMs
      );
    }
  }

  private async evaluateBulkEmailTasks(): Promise<void> {
    return traced(SVC_NAME, "evaluateBulkEmailTasks", async () => {
      logger(LOG_TAG, "evaluating email tasks");
      for (const task of this.emailTasks) {
        try {
          await this.evaluateBulkEmailTask(task);
        } catch (e) {
          logger(LOG_TAG, `failed to evaluate bulk email task ${task.name}`, e);
          this.rollbarService.reportError(e);
        }
      }
    });
  }

  private async evaluateBulkEmailTask(
    task: EmailTaskDefinition
  ): Promise<void> {
    logger(LOG_TAG, `evaluating bulk email task ${task.name}`);

    if (!BulkEmailService.isEmailTaskDue(task)) {
      logger(
        LOG_TAG,
        `bulk email task ${
          task.name
        } is not due until ${task.sendTimestamp.toISOString()} - finished evaluating`
      );
    }

    logger(LOG_TAG, `task due: ${task.name}`);
  }

  private static isEmailTaskDue(task: EmailTaskDefinition): boolean {
    return task.sendTimestamp.getTime() > Date.now();
  }
}

export function startBulkEmailService(
  context: ApplicationContext,
  emailService: EmailService,
  rollbarService: RollbarService
) {
  logger("[INIT] creating bulk email service");
  const emailTasks = Object.freeze([ADMIN_HELLO_EMAIL]);
  const bulkEmailService = new BulkEmailService(
    context,
    emailService,
    rollbarService,
    emailTasks
  );
  bulkEmailService.start();
  return bulkEmailService;
}
