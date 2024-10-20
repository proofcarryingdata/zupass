import { bigintToPseudonymNumber, emailToBigint } from "@pcd/util";
import express, { Request, Response } from "express";
import { kvGetByPrefix } from "../../database/queries/kv";
import { sqlTransaction } from "../../database/sqlQuery";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";

export function initMiscRoutes(
  app: express.Application,
  context: ApplicationContext,
  _services: GlobalServices
): void {
  logger("[INIT] initializing misc routes");

  app.get(
    "/misc/protocol-worlds-scoreboard",
    async (req: Request, res: Response) => {
      const scores = (await sqlTransaction(context.dbPool, (client) =>
        kvGetByPrefix(client, "protocol_worlds_score:")
      )) as Array<{ email: string; score: number }>;

      scores.sort((a, b) => b.score - a.score);

      res.send(`
        <html>
          <head>
            <title>Protocol Worlds Scoreboard</title>
            <style>
              body { 
                font-family: Menlo, monospace;
                display: flex;
                justify-content: center;
                align-items: center;
                margin-top: 100px;
                flex-direction: column;
                background-color: #19473f;
                color: white;
              }
              h2 {
                margin-bottom: 12px;
              }
              table { 
                margin-top: 8px;
                border-collapse: separate;
                border-spacing: 0;
                background-color: #206b5e;
                border-radius: 10px;
                overflow: hidden;
              }
              th:first-child {
                border-top-left-radius: 10px;
              }
              th:last-child {
                border-top-right-radius: 10px;
              }
              tr:last-child td:first-child {
                border-bottom-left-radius: 10px;
              }
              tr:last-child td:last-child {
                border-bottom-right-radius: 10px;
              }
              a {
                color: white;
              }
              th, td { border: 1px solid white; padding: 12px; }
            </style>
          </head>
          <body>
            <h2>Protocol Worlds Leaderboard</h2>
            <h3>View your tensions in the <a target="_blank" href="https://zupass.org/#/?folder=Protocol%2520Worlds">Protocol Worlds folder</a>.</h3>
            <table>
              <tr><th>Rank</th><th>Pseudonym</th><th>Score</th></tr>
              ${scores
                .map(
                  (score, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${bigintToPseudonymNumber(
                    emailToBigint(score.email)
                  )}</td>
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
