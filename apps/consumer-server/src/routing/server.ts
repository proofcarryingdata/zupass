import cors from "cors";
import express from "express";
import morgan from "morgan";
import { ApplicationContext } from "../types";
import { initHealthcheckRoutes } from "./routes/healthCheckRoutes";
import { generateWatermark } from "./routes/zuauth/generateWatermark";
import { isLoggedIn } from "./routes/zuauth/isLoggedIn";
import { login } from "./routes/zuauth/login";
import { logout } from "./routes/zuauth/logout";
import { RouteInitializer } from "./types";

const routes: RouteInitializer[] = [
  initHealthcheckRoutes,
  login,
  isLoggedIn,
  logout,
  generateWatermark
];

export async function startServer(
  context: ApplicationContext
): Promise<express.Application> {
  return new Promise<express.Application>((resolve, reject) => {
    const port = process.env.PORT ?? 3003;
    const app = express();
    app.use(morgan("tiny"));

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors({ origin: true, credentials: true }));

    routes.forEach((r) => r(app, context));

    app
      .listen(port, () => {
        console.log(`[INIT] HTTP server listening on port ${port}`);
        resolve(app);
      })
      .on("error", (e: Error) => {
        reject(e);
      });

    return app;
  });
}
