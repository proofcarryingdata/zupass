require("hardhat-circom");
let secret = require("./secret");
// require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-waffle");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.6.11",
      },
      {
        version: "0.8.9",
      },
    ],
  },
  networks: {
    goerli: {
      url: secret.goerli,
      accounts: [secret.key],
      gas: 350000000000,
      gasPrice: 80000000000,
    },
  },
  allowUnlimitedContractSize: true,
  circom: {
    inputBasePath: "./circuits",
    ptau: "powersOfTau28_hez_final_22.ptau",
    circuits: [
      {
        name: "jwt",
        protocol: "groth16",
      },
    ],
  },
};
