import * as path from "path";

const circuitFilePath = path.join(
  __dirname,
  "../artifacts/pubkey_membership.circuit"
);
const wasmFilePath = path.join(
  __dirname,
  "../artifacts/pubkey_membership.wasm"
);

describe("ETH pubkey group membership check should work", function () {});
