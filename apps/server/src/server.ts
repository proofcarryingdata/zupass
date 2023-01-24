import express, {Request, Response} from "express";
import { IS_PROD } from "./isProd";

console.log("starting server");

const app = express()
const port = IS_PROD ? 8080 : 3002;

app.get('/', (req: Request, res:Response) => {
  res.send('Hello World!')
})
 
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})