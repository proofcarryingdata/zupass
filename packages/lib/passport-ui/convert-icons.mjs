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
  const newestIconTimestamp = iconFiles.reduce((newest, filename) => {
    return Math.max(newest, fs.statSync(`icons/${filename}`).mtimeMs);
  }, 0);

  if (newestIconTimestamp <= fs.statSync("src/icons/index.ts").mtimeMs) {
    console.log("No changed icons detected");
    return;
  }

  const iconPaths = iconFiles
    .filter((filename) => path.extname(filename) === ".svg")
    .map((filename) => `icons/${filename}`);

  const iconIndex = await Promise.all(
    iconPaths.map(async (iconPath) => {
      return [path.basename(iconPath, ".svg"), await svgToUrl(iconPath)];
    })
  );

  const output = iconIndex
    .map(([name, dataUrl]) => {
      return `export const ${camelCase(name)} = "${dataUrl}";`;
    })
    .join("\r\n\r\n");

  fs.writeFileSync(
    "src/icons/index.ts",
    await prettier.format(output, { parser: "typescript" })
  );
}

main();
