import express, { Request, Response } from "express";
import { IS_PROD } from "./isProd";

console.log("starting server");

const app = express();
const port = IS_PROD ? process.env.PORT : 3002;

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
