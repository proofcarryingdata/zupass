import express, { Request, Response } from "express";
import { kvGetByPrefix } from "../../database/queries/kv";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";

export function initMiscRoutes(
  app: express.Application,
  context: ApplicationContext,
  _services: GlobalServices
): void {
  logger("[INIT] initializing misc routes");

  /**
   * Lets the Zupass client log stuff to honeycomb.
   *
   * @todo rate limit this.
   */
  app.get(
    "/misc/protocol-worlds-scoreboard",
    async (req: Request, res: Response) => {
      const scores = (await kvGetByPrefix(
        context.dbPool,
        "protocol_worlds_score:"
      )) as Array<{ email: string; score: number }>;

      scores.sort((a, b) => b.score - a.score);

      res.send(`
        <html>
          <head>
            <title>Protocol Worlds Scoreboard</title>
            <style>
              table { border-collapse: collapse; }
              th, td { border: 1px solid black; padding: 5px; }
            </style>
          </head>
          <body>
            <h1>Protocol Worlds Scoreboard</h1>
            <table>
              <tr><th>Rank</th><th>Email</th><th>Score</th></tr>
              ${scores
                .map(
                  (score, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${score.email}</td>
                  <td>${score.score}</td>
                </tr>
              `
                )
                .join("")}
            </table>
          </body>
        </html>
      `);
    }
  );
}
