import { generate_inputs } from "./test";

export async function generateInputs() {
  const inputs = await generate_inputs();

  console.log(inputs);

  // process.exit(0);

  return inputs;
}
