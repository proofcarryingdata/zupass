import { RSAPCDPackage } from "@pcd/rsa-pcd";
import "mocha";
import { PCDFileSystem } from "../src/PCDFileSystem";
import { PCDPackages } from "../src/PCDPackages";
import { newPCD } from "./util";

describe.only("PCD File System", async function () {
  this.timeout(30 * 1000);

  const packages = [RSAPCDPackage];

  it("should let you manage a file system", async function () {
    const pcdList = await Promise.all([newPCD(), newPCD()]);
    const fs = new PCDFileSystem(new PCDPackages(packages));

    await fs.addPCD("/", pcdList[0]);
    console.log("pcds in directory", await fs.getPcdsInDirectory("/"));
  });
});
