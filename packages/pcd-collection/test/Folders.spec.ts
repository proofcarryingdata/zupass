import { expect } from "chai";
import "mocha";
import {
  getAllAncestors,
  getNameFromPath,
  getParentFolder,
  isChild,
  isFolderAncestor,
  isRootFolder,
  normalizePath,
  splitPath
} from "../src/util";

describe.only("Folder manipulation logic", async function () {
  this.timeout(30 * 1000);

  it("splitPath should work", async function () {
    expect(splitPath("/a")).to.deep.eq(["a"]);

    expect(splitPath("/a/b/c")).to.deep.eq(["a", "b", "c"]);
    expect(splitPath("/a/b/c/")).to.deep.eq(["a", "b", "c"]);
    expect(splitPath("a/b/c/")).to.deep.eq(["a", "b", "c"]);
    expect(splitPath("a/b/c")).to.deep.eq(["a", "b", "c"]);

    expect(splitPath("/")).to.deep.eq([]);
    expect(splitPath("//////")).to.deep.eq([]);
    expect(splitPath("////a/////b")).to.deep.eq(["a", "b"]);
  });

  it("isFolderAncestor should work", async function () {
    expect(isFolderAncestor("/a/b", "/a")).to.eq(true);
    expect(isFolderAncestor("/a/b/c", "/a")).to.eq(true);

    expect(isFolderAncestor("/a/b", "/b")).to.eq(false);
    expect(isFolderAncestor("/a/b", "b")).to.eq(false);
    expect(isFolderAncestor("/a/b/c", "/a/b/c")).to.eq(false);
    expect(isFolderAncestor("/", "/")).to.eq(false);
  });

  it("getAllAncestors should work", async function () {
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

  it("isRootFolder should work", function () {
    expect(isRootFolder("")).to.eq(true);
    expect(isRootFolder("/")).to.eq(true);
    expect(isRootFolder("/////")).to.eq(true);
  });

  it("getNameFromPath should work", function () {
    expect(getNameFromPath("a/b/c")).to.eq("c");
    expect(getNameFromPath("a")).to.eq("a");
    expect(getNameFromPath("")).to.eq("");
  });

  it("getParentFolder should work", function () {
    expect(getParentFolder("a/b/c")).to.eq("a/b");
    expect(getParentFolder("a")).to.eq("");
    expect(getParentFolder("")).to.eq("");
  });

  it("normalizePath should work", function () {
    expect(normalizePath("")).to.eq("");
    expect(normalizePath("/")).to.eq("");
    expect(normalizePath("/a/b/c")).to.eq("a/b/c");
  });

  it("isDirectDescendant should work", function () {
    expect(isChild("a/b", "a/b/c")).to.eq(true);
    expect(isChild("a/b", "a/b/c/d")).to.eq(false);
    expect(isChild("", "a")).to.eq(false);
    expect(isChild("/", "a")).to.eq(false);
  });
});
