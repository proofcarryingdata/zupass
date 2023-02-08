const hre = require("hardhat");
const secret = require("../secret.json");

async function main() {
  const verifier = await hre.ethers.getContractFactory("contracts/Verifier.sol:Verifier");
  const v = await verifier.deploy();
  await v.deployed();

  console.log("Verifier.sol deployed to:", v.address)

  const blind = await hre.ethers.getContractFactory("Blind");

  const b = await blind.deploy(
    v.address
  );
  await b.deployed();

  console.log("Blind.sol deployed to:", b.address)
}

main();
