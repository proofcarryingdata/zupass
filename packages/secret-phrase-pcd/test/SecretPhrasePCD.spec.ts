import { ArgumentTypeName } from "@pcd/pcd-types";
import { SecretPhrasePCD, SecretPhrasePCDPackage } from "@pcd/secret-phrase-pcd";
import "mocha";
import path from "path";


describe("RSA Ticket PCD should work", function () {
  this.timeout(1000 * 30);

  const phrase = "message to sign";
  let pcd: SecretPhrasePCD;

  this.beforeAll(async () => {
    const fullPath = path.join(__dirname, "../artifacts/");

    await SecretPhrasePCDPackage.init?.({
      wasmFilePath: `${fullPath}/../artifacts/circuit.wasm`,
      zkeyFilePath: `${fullPath}/../artifacts/circuit.zkey`
    });

    pcd = await SecretPhrasePCDPackage.prove({
      phraseId: {
        argumentType: ArgumentTypeName.Number,
        value: "1",
      },
      username: {
        argumentType: ArgumentTypeName.String,
        value: "jp4g",
      },
      secret: {
        argumentType: ArgumentTypeName.String,
        value: phrase,
      },
      secretHash: {
        argumentType: ArgumentTypeName.String,
        value: "111111",
      }
    });
  });
  it("should not fail on before", async function () {
    console.log("wow it didn't fail");
  });

  // it("should be possible to set a custom id", async function () {
  //   ticketPCD = await RSATicketPCDPackage.prove({
  //     id: {
  //       argumentType: ArgumentTypeName.String,
  //       value: undefined
  //     },
  //     rsaPCD: {
  //       argumentType: ArgumentTypeName.PCD,
  //       value: await RSAPCDPackage.serialize(rsaPCD)
  //     }
  //   });

  //   const valid = await RSATicketPCDPackage.verify(ticketPCD);
  //   expect(valid).to.eq(true);
  // });

  // it("should be possible to serialize and deserialize the pcd", async function () {
  //   const serialized = await RSATicketPCDPackage.serialize(ticketPCD);
  //   const deserialized = await RSATicketPCDPackage.deserialize(serialized.pcd);

  //   expect(ticketPCD).to.deep.eq(deserialized);
  // });
});
