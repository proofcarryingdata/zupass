import { RSAPCDPackage } from "@pcd/rsa-pcd";
import "mocha";
import { PCDDisk } from "../src/PCDDisk";
import { PCDFS } from "../src/PCDFS";
import { PCDPackages } from "../src/PCDPackages";
import { newPCD } from "./util";

describe.only("PCD File System", async function () {
  this.timeout(30 * 1000);
  const packages = new PCDPackages([RSAPCDPackage]);

  it("should let you manage a file system", async function () {
    const pcd = await newPCD();
    const fs = new PCDFS(() => new PCDDisk(packages));
    await fs.insertPCD(pcd, "/");
    console.log("pcds in directory", await fs.getPCDsInDirectory("/"));
  });
});
