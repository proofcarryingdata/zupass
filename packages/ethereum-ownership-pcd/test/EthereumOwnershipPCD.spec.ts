/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ethers } from "ethers";
import * as path from "path";

const zkeyFilePath: string = path.join(__dirname, "../artifacts/16.zkey");
const wasmFilePath: string = path.join(__dirname, "../artifacts/16.wasm");

describe("semaphore signature PCD should work", function () {
  it("should work", async function () {
    const newWallet = ethers.Wallet.createRandom(null);
    console.log(newWallet);
  });
});
