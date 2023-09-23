import { readFileSync } from "fs";
import { createServer } from "https";
import next from "next";
import { parse } from "url";

const port = parseInt(process.env.PORT || "4000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const localEndpoint = `https://dev.local:${port}`;
const httpsOptions = {
  key: readFileSync("../certificates/dev.local-key.pem"),
  cert: readFileSync("../certificates/dev.local.pem")
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`HTTPS server ready on ${localEndpoint}`);
  });
});
