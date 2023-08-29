import { expect } from "chai";
import _ from "lodash";
import "mocha";
import {
  getAllAncestors,
  isDirectDescendant,
  isFolderAncestor,
  splitPath
} from "../src/util";

describe.only("Folder manipulation logic", async function () {
  this.timeout(30 * 1000);

  it("should let you split paths", async function () {
    expect(splitPath("/a")).to.deep.eq(["a"]);

    expect(splitPath("/a/b/c")).to.deep.eq(["a", "b", "c"]);
    expect(splitPath("/a/b/c/")).to.deep.eq(["a", "b", "c"]);
    expect(splitPath("a/b/c/")).to.deep.eq(["a", "b", "c"]);
    expect(splitPath("a/b/c")).to.deep.eq(["a", "b", "c"]);

    expect(splitPath("/")).to.deep.eq([]);
    expect(splitPath("//////")).to.deep.eq([]);
    expect(splitPath("////a/////b")).to.deep.eq(["a", "b"]);
  });

  it("should let you check folder ancestry", async function () {
    expect(isFolderAncestor("/a/b", "/a")).to.eq(true);
    expect(isFolderAncestor("/a/b/c", "/a")).to.eq(true);

    expect(isFolderAncestor("/a/b", "/b")).to.eq(false);
    expect(isFolderAncestor("/a/b", "b")).to.eq(false);
    expect(isFolderAncestor("/a/b/c", "/a/b/c")).to.eq(false);
    expect(isFolderAncestor("/", "/")).to.eq(false);
  });

  it("should properly generate ancestor folders", async function () {
    expect(getAllAncestors("/a/b")).to.deep.eq(["a", ""]);
    expect(getAllAncestors("/a/b/c")).to.deep.eq(["a/b", "a", ""]);
    expect(getAllAncestors("/a/b/c/d/e/f")).to.deep.eq([
      "a/b/c/d/e",
      "a/b/c/d",
      "a/b/c",
      "a/b",
      "a",
      ""
    ]);
  });

  it("asdf", async function () {
    const folderPath = "1/a";
    const allPaths = ["1/a/b/d", "1/a/b/c", "1/a/q/f"];

    console.log("folderPath", folderPath);

    const descendantsOfFolder = _.uniq(
      allPaths.filter((p) => isFolderAncestor(p, folderPath))
    );

    console.log("descendantsOfFolder", descendantsOfFolder);

    const descendantsWithMissing = _.uniq(
      descendantsOfFolder.flatMap((path) => getAllAncestors(path))
    ).filter((a) => a !== "");

    console.log("descendantsWithMissing", descendantsWithMissing);

    const directDescendants = descendantsWithMissing.filter((d) =>
      isDirectDescendant(folderPath, d)
    );

    console.log("directDescendants", directDescendants);
  });
});
