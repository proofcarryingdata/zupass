require("hardhat-circom");
// require("@nomiclabs/hardhat-waffle");

module.exports = {
  circom: {
    inputBasePath: "./circuits",
    ptau: "powersOfTau28_hez_final_22.ptau",
    circuits: [
      {
        name: "main",
        protocol: "groth16",
      },
    ],
  },
};
