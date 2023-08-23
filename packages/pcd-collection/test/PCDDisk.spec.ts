import { RSAPCDPackage } from "@pcd/rsa-pcd";
import { expect } from "chai";
import "mocha";
import { PCDDisk } from "../src/PCDDisk";
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
    await disk.insertPCD(pcd, "/");
    const snapshot = await disk.getSnapshot();
    console.log();
    console.log("THE SNAPSHOT IS", snapshot);
  });
});
