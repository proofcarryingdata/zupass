// import or require (depending on your module system)
import { ExtismContext } from "@extism/runtime-browser";

export async function testPlugin() {
  // Or you can pass in a path to a wasm file
  // this is our count-vowels example plugin
  const manifest = {
    wasm: [
      {
        path: "https://raw.githubusercontent.com/extism/extism/main/wasm/code.wasm",
      },
    ],
  };

  const ctx = new ExtismContext();
  const plugin = await ctx.newPlugin(manifest);

  // call the function 'count_vowels' defined in the wasm module
  const output = await plugin.call("count_vowels", "this is a test");

  console.log(JSON.parse(new TextDecoder().decode(output)));
}
