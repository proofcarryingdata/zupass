import { RSAPCDPackage } from "@pcd/rsa-pcd";
import { expect } from "chai";
import "mocha";
import { Directory, PCDDisk } from "../src/PCDDisk";
import { PCDPackages } from "../src/PCDPackages";
import { newPCD } from "./util";

describe.only("PCD Disk", async function () {
  this.timeout(30 * 1000);
  const packages = new PCDPackages([RSAPCDPackage]);

  it("should let you create a new PCD disk CRUD PCDs", async function () {
    const pcd = await newPCD();
    const disk = new PCDDisk(packages);
    await disk.insertPCD(pcd, "/");
    const pcdsInDir = await disk.getPCDsInDirectory("/");
    expect(pcdsInDir).to.deep.eq([pcd]);
  });

  it("should let you get a snapshot data structure", async function () {
    const pcd = await newPCD();
    const disk = new PCDDisk(packages);

    disk.mkdirp("/foo");
    disk.mkdirp("/bar");
    disk.mkdirp("/foo/baz");

    await disk.insertPCD(pcd, "/");
    await disk.insertPCD(pcd, "/foo");
    await disk.insertPCD(pcd, "/bar");
    await disk.insertPCD(pcd, "/foo/baz");

    const snapshot = await disk.getSnapshot();

    expect(snapshot).to.deep.eq({
      path: "/",
      pcds: [pcd],
      childDirectories: [
        {
          path: "/bar",
          pcds: [pcd],
          childDirectories: []
        },
        {
          path: "/foo",
          pcds: [pcd],
          childDirectories: [
            { path: "/foo/baz", childDirectories: [], pcds: [pcd] }
          ]
        }
      ]
    } satisfies Directory);
  });
});
