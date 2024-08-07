import { expect } from "chai";
import "mocha";
import {
  escapePathSegment,
  getAllAncestors,
  getFoldersInFolder,
  getNameFromPath,
  getParentFolder,
  isChild,
  isFolderAncestor,
  isRootFolder,
  joinPath,
  normalizePath,
  splitPath
} from "../src/util";

describe("Folder manipulation", async function () {
  it("getFoldersInFolder", async function () {
    const allPaths = [
      "a",
      "a/b",
      "a/b/c",
      "a/b/c/d/e",
      "a/b/c/p/q",
      "a/b/q/r/s",
      "a/l",
      "a/m/n",
      "p",
      "p/q"
    ];
    expect(getFoldersInFolder("a", allPaths)).to.have.members([
      "a/b",
      "a/l",
      "a/m"
    ]);
    expect(getFoldersInFolder("a/b", allPaths)).to.have.members([
      "a/b/c",
      "a/b/q"
    ]);
    expect(getFoldersInFolder("a/b/c", allPaths)).to.have.members([
      "a/b/c/d",
      "a/b/c/p"
    ]);
  });

  it("getAllAncestors", async function () {
    expect(getAllAncestors("/a/b")).to.have.members(["a", ""]);
    expect(getAllAncestors("/a/b/c")).to.have.members(["a/b", "a", ""]);
    expect(getAllAncestors("/a/b/c/d/e/f")).to.have.members([
      "a/b/c/d/e",
      "a/b/c/d",
      "a/b/c",
      "a/b",
      "a",
      ""
    ]);
  });

  it("isChild", function () {
    expect(isChild("a/b", "a/b/c")).to.eq(true);
    expect(isChild("a/b", "a/b/c/d")).to.eq(false);
    expect(isChild("", "a")).to.eq(true);
    expect(isChild("/", "a")).to.eq(true);
  });

  it("isFolderAncestor", async function () {
    expect(isFolderAncestor("/a/b", "/a")).to.eq(true);
    expect(isFolderAncestor("/a/b/c", "/a")).to.eq(true);

    expect(isFolderAncestor("/a/b", "/b")).to.eq(false);
    expect(isFolderAncestor("/a/b", "b")).to.eq(false);
    expect(isFolderAncestor("/a/b/c", "/a/b/c")).to.eq(false);
    expect(isFolderAncestor("/", "/")).to.eq(false);
  });

  it("splitPath", async function () {
    expect(splitPath("/a")).to.have.members(["a"]);

    expect(splitPath("/a/b/c")).to.have.members(["a", "b", "c"]);
    expect(splitPath("/a/b/c/")).to.have.members(["a", "b", "c"]);
    expect(splitPath("a/b/c/")).to.have.members(["a", "b", "c"]);
    expect(splitPath("a/b/c")).to.have.members(["a", "b", "c"]);

    expect(splitPath("/")).to.have.members([]);
    expect(splitPath("//////")).to.have.members([]);
    expect(splitPath("////a/////b")).to.have.members(["a", "b"]);
  });

  it("joinPath", function () {
    expect(joinPath("a", "b", "c")).to.eq("a/b/c");
    expect(joinPath("a/b", "b", "c")).to.eq("ab/b/c");
  });

  it("normalizePath", function () {
    expect(normalizePath("")).to.eq("");
    expect(normalizePath("/")).to.eq("");
    expect(normalizePath("/a/b/c")).to.eq("a/b/c");
  });

  it("getParentFolder", function () {
    expect(getParentFolder("a/b/c")).to.eq("a/b");
    expect(getParentFolder("a")).to.eq("");
    expect(getParentFolder("")).to.eq("");
  });

  it("isRootFolder", function () {
    expect(isRootFolder("")).to.eq(true);
    expect(isRootFolder("/")).to.eq(true);
    expect(isRootFolder("/////")).to.eq(true);
    expect(isRootFolder("a")).to.eq(false);
  });

  it("getNameFromPath", function () {
    expect(getNameFromPath("a/b/c")).to.eq("c");
    expect(getNameFromPath("a")).to.eq("a");
    expect(getNameFromPath("")).to.eq("");
  });

  it("escapePathSegment", function () {
    expect(escapePathSegment("a/b/c")).to.eq("abc");
    expect(escapePathSegment("a")).to.eq("a");
    expect(escapePathSegment("")).to.eq("");
  });
});
