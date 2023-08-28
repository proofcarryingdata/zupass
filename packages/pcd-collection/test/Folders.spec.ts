import { expect } from "chai";
import "mocha";
import { isFolderAncestor, splitPath } from "../src/util";

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
});
