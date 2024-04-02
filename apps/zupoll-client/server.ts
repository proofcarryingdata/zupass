import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { ServerOptions, createServer } from "https";
import next from "next";
import { parse } from "url";

/**
 * For use in https mode, which is needed to test the telegram integration.
 */

dotenv.config();

const port = parseInt(process.env.ZUPOLL_CLIENT_PORT ?? "3012", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const localEndpoint = `https://dev.local:${port}`;
const httpsOptions = {
  key: readFileSync("../certificates/dev.local-key.pem"),
  cert: readFileSync("../certificates/dev.local.pem")
} satisfies ServerOptions;

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`HTTPS server ready on ${localEndpoint}`);
  });
});
