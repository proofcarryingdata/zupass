import camelCase from "camelcase";
import * as fs from "fs";
import path from "path";
import * as prettier from "prettier";
import svgToUrl from "svg-to-url";

/**
 * This file converts the icons in the ./icons directory into data URLs, then
 * creates a src/icons/index.ts file which exports the resulting strings.
 * This performs the same task that a webpack/esbuild data loader would do, but
 * without requiring a bundler.
 * This is helpful because it means we can build this package using only tsc.
 * It should not be necessary to run this script manually, as it is run
 * automatically as part of the build process for this package.
 */
async function main() {
  const iconFiles = fs.readdirSync("icons");

  const iconPaths = iconFiles
    .filter((filename) => path.extname(filename) === ".svg")
    .map((filename) => `icons/${filename}`);

  const iconIndex = await Promise.all(
    iconPaths.map(async (iconPath) => {
      return [path.basename(iconPath, ".svg"), await svgToUrl(iconPath)];
    })
  );

  console.log(`Read ${iconIndex.length} icons`);

  const output = iconIndex
    .map(([name, dataUrl]) => {
      return `export const ${camelCase(name)} = "${dataUrl}";`;
    })
    .join("\r\n\r\n");

  const formattedOutput = await prettier.format(output, {
    parser: "typescript"
  });

  const indexFilePath = "src/icons/index.ts";

  const currentIndexContent = fs.readFileSync(indexFilePath);

  if (currentIndexContent.toString() !== formattedOutput) {
    console.log(`Icon index file has changed, updating ${indexFilePath}`);
    fs.writeFileSync(indexFilePath, formattedOutput);
  } else {
    console.log("No changes to icon index file");
  }
}

main();
