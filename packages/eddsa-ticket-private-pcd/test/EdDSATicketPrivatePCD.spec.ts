import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { EdDSATicketPCDPackage, ITicketData } from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { Eddsa, PoseidonFn, buildEddsa, buildPoseidon } from "circomlibjs";
import "mocha";
import * as path from "path";
import {
  EdDSATicketFieldsRequest,
  EdDSATicketPrivatePCD,
  EdDSATicketPrivatePCDPackage,
  EdDSATicketPrivatePCDTypeName
} from "../src";
import { fromHexString } from "../src/utils/utils";

const zkeyFilePath = path.join(__dirname, `../artifacts/circuit_final.zkey`);
const wasmFilePath = path.join(
  __dirname,
  `../artifacts/eddsaTicket_js/eddsaTicket.wasm`
);

let eddsa: Eddsa;
let poseidon: PoseidonFn;

describe("EdDSA partial ticket should work", function () {
  this.timeout(1000 * 30);

  let resp: EdDSATicketPrivatePCD;

  this.beforeAll(async function () {
    await EdDSAPCDPackage.init!({});
    await EdDSATicketPCDPackage.init!({});
    if (!EdDSATicketPrivatePCDPackage.init) return;
    await EdDSATicketPrivatePCDPackage.init({
      zkeyFilePath,
      wasmFilePath
    });

    eddsa = await buildEddsa();
    poseidon = await buildPoseidon();
  });

  it("should generate a valid proof", async function () {
    const identity = new Identity(
      '["329061722381819402313027227353491409557029289040211387019699013780657641967", "99353161014976810914716773124042455250852206298527174581112949561812190422"]'
    );

    // Key borrowed from https://github.com/iden3/circomlibjs/blob/4f094c5be05c1f0210924a3ab204d8fd8da69f49/test/eddsa.js#L103
    const prvKey =
      "0001020304050607080900010203040506070809000102030405060708090001";

    const ticketData: ITicketData = {
      // the fields below are not signed and are used for display purposes

      attendeeName: "test name",
      attendeeEmail: "user@test.com",
      eventName: "event",
      ticketName: "ticket",
      checkerEmail: "checker@test.com",

      // the fields below are signed using the server's private eddsa key

      ticketId: "b38501b0-cf66-4416-a4ef-631a9a9b32c4",
      eventId: "4332f16c-8444-4261-94b9-a0ba8ca917e2",
      productId: "c94002fb-2c41-480b-842d-fa826fb517e5",
      timestampConsumed: 0,
      timestampSigned: 1693028498280,
      attendeeSemaphoreId: identity.getCommitment().toString(),
      isConsumed: false,
      isRevoked: false
    };

    const fieldsRequested: EdDSATicketFieldsRequest = {
      revealTicketId: false,
      revealEventId: true,
      revealProductId: true,
      revealTimestampConsumed: false,
      revealTimestampSigned: false,
      revealAttendeeSemaphoreId: false,
      revealIsConsumed: false,
      revealIsRevoked: false,
      revealNullifierHash: true
    };

    const externalNullifier = BigInt(5);
    const watermark = BigInt(6);

    let ticketPCD = await EdDSATicketPCDPackage.prove({
      ticket: {
        value: ticketData,
        argumentType: ArgumentTypeName.Object
      },
      privateKey: {
        value: prvKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: undefined,
        argumentType: ArgumentTypeName.String
      }
    });

    const signatureRaw = eddsa.unpackSignature(
      fromHexString(ticketPCD.proof.eddsaPCD.proof.signature)
    );

    const signature = {
      R8x: (poseidon as any).F.toObject(signatureRaw.R8[0]),
      R8y: (poseidon as any).F.toObject(signatureRaw.R8[1]),
      S: signatureRaw.S
    };

    let serializedTicketPCD = await EdDSATicketPCDPackage.serialize(ticketPCD);

    let identityPCD = await SemaphoreIdentityPCDPackage.prove({
      identity
    });

    let serializedIdentityPCD =
      await SemaphoreIdentityPCDPackage.serialize(identityPCD);

    let eddsaRespPCD = await EdDSATicketPrivatePCDPackage.prove({
      ticket: {
        value: serializedTicketPCD,
        argumentType: ArgumentTypeName.PCD,
        pcdType: EdDSATicketPrivatePCDTypeName
      },
      identity: {
        value: serializedIdentityPCD,
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDTypeName
      },
      fieldsRequested: {
        value: fieldsRequested,
        argumentType: ArgumentTypeName.Object
      },
      watermark: {
        value: watermark.toString(),
        argumentType: ArgumentTypeName.BigInt
      },
      externalNullifier: {
        value: externalNullifier.toString(),
        argumentType: ArgumentTypeName.BigInt
      }
    });

    let verificationRes =
      await EdDSATicketPrivatePCDPackage.verify(eddsaRespPCD);

    /*
    const signatureRaw = eddsa.unpackSignature(
      fromHexString(ticket.proof.eddsaPCD.proof.signature)
    );

    const signature = {
      R8x: (poseidon as any).F.toObject(signatureRaw.R8[0]),
      R8y: (poseidon as any).F.toObject(signatureRaw.R8[1]),
      S: signatureRaw.S
    };
    console.log("signature");
    console.log(signature);
    */
  });
});
