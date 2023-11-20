import cors from "cors";
import express from "express";
import { initFeedHost } from "./feeds";
import routes from "./routes";

class Application {
  private server: express.Express;

  public constructor() {
    this.server = express();
    this.middlewares();
    this.routes();
  }

  private middlewares() {
    this.server.use(express.json());
    this.server.use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
      })
    );
  }

  private routes() {
    this.server.use(routes);
  }

  public async start({ port }: { port: number }) {
    console.log(`Server starting at http://localhost:${port}`);
    await initFeedHost();
    this.server.listen(port);
  }
}

export default Application;
