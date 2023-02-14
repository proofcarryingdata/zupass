import { generate_inputs } from "./generate_input";
import * as fs from "fs";

async function writeNewInputs() {
  console.log("****GENERATING JSON INPUT****");
  const inputs = await generate_inputs();
  fs.writeFileSync(`./rsa.json`, JSON.stringify(inputs), { flag: "w" });
}

writeNewInputs();
