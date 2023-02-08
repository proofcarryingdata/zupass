const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Token contract", function () {
  it("User's public key and company should be added to contract mapping", async function () {
    const [owner] = await ethers.getSigners();

    const verifier = await ethers.getContractFactory(
      "contracts/Verifier.sol:Verifier"
    );
    const v = await verifier.deploy();
    await v.deployed();

    console.log("Verifier.sol deployed to:", v.address);

    const blind = await ethers.getContractFactory("Blind");

    const bl = await blind.deploy(v.address);
    await bl.deployed();
    console.log("Blind.sol deployed to:", bl.address);

    const a = [
      "0x2c1e3db7ca8d2d6a79baffd041517bcf998238e0bf8ea3effc497928fd311eb1",
      "0x1a392f897b8fd49f444bc564bbdbf1e6de0f543f21c0da843cbbffa49c35f413",
    ];
    const b = [
      [
        "0x06d60c0960e5131a815d8a6a47c9ae09d55adaab4bc1ec2b2ce05c8313776b22",
        "0x26a4709c8ddf5a0daae9e88d08f7651f38f361c3320c0f28f983d4db37817f7d",
      ],
      [
        "0x28cbe868d242cc688dd02c27988aa2bca07183be2382a7655a164c501f5a995a",
        "0x0ec161649cb422bd543460a6c2c3ed6d5d614d2c0374080ee409740f905ca5f3",
      ],
    ];
    const c = [
      "0x1b884deb93e61579d476150218f33c3e9d753e62c348533df84ae43af8523614",
      "0x222d4e918221b586d3d0a721cbfd74d72ee44c854a8016e5792cd0ce30d72e4b",
    ];
    const input = [
      "0xc8430c6464e64ddda07a9b863d8881",
      "0x01cd0da2c4ae4218b0cade824b613b37",
      "0x62e5c346b31c47a050182d2eafd848",
      "0x0618669ce3a3538eaddc8d6ced08b9",
      "0xd75cdc8d790c81ab9c23625464a414",
      "0x011954a4b6d45c95fa48f63ffec9f0ad",
      "0x01e075c1b0cf7069eac655ee53f6cb80",
      "0x60409af02b53bf34965950c557a044",
      "0x16b77d2e3917ea5af4e7363a68cffe",
      "0x7283ffb204c691aaf1bce0ac279328",
      "0x01785e45f8b6da078bb330084a557dbd",
      "0x3520db147c498f546c95853efc64f3",
      "0x01a652f8aede242fe83a7af1091cc560",
      "0x0177e578067b3fc1873b4838e2597d79",
      "0x82c7f533459aff65a02e6f635fae51",
      "0xa00bcf4e84dc9a972a8eab541dfb33",
      "0xdbbace12b0ce3ef3dcde63800d8b",
      "0x0acba2baa02f59d8a3d738d97008f909fb92e9fb",
      "0x62",
      "0x65",
      "0x72",
      "0x6b",
      "0x65",
      "0x6c",
      "0x65",
      "0x79",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
      "0x00",
    ];

    const add = await bl.add(a, b, c, input);
    console.log(add);

    const res = await bl.get("0x0acba2baa02f59d8a3d738d97008f909fb92e9fb");
    console.log(res);

    expect(res).to.equal("berkeley");
  });
});
