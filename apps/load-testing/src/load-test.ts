import { passportEncrypt, PCDCrypto } from "@pcd/passport-crypto";
import { ISSUANCE_STRING, IssuedPCDsRequest } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { uploadEncryptedStorage } from "./api/endToEndEncryptionApi";
import { requestIssuedPCDs } from "./api/issuedPCDs";
import { requestLoginCode, submitNewUser } from "./api/user";


async function testSingleUser() {
  const email = 'ivan@0xparc.org';
  const identity = new Identity();
  const crypto = await PCDCrypto.newInstance();
  const encryptionKey = await crypto.generateRandomKey();
  const code: string | undefined = await requestLoginCode(email, identity.commitment.toString(), true);
  const newUserResponse = await submitNewUser(email, code, identity.commitment.toString());
  const user = await newUserResponse.json();
  console.log('logged in as user', user);
  console.log("proving that I am a user");
  const request: IssuedPCDsRequest = {
    userProof: await SemaphoreSignaturePCDPackage.serialize(
      await SemaphoreSignaturePCDPackage.prove({
        identity: {
          argumentType: ArgumentTypeName.PCD,
          value: await SemaphoreIdentityPCDPackage.serialize(
            await SemaphoreIdentityPCDPackage.prove({
              identity: identity
            })
          )
        },
        signedMessage: {
          argumentType: ArgumentTypeName.String,
          value: ISSUANCE_STRING
        }
      })
    )
  };
  console.log("proved that I am a user");
  console.log("getting issued pcds")
  const issuedPCDs = await requestIssuedPCDs(request)
  console.log("get issued pcds", issuedPCDs)
  console.log("saving e2ee data");
  const encryptedStorage = await passportEncrypt(
    JSON.stringify({
      a: "b"
    }),
    encryptionKey
  );
  
  await uploadEncryptedStorage(encryptionKey, encryptedStorage);
  console.log("saved e2ee data");
}

async function runLoadTest() {
  await SemaphoreSignaturePCDPackage.init({
    wasmFilePath: "../passport-server/public/semaphore-artifacts/16.wasm", 
    zkeyFilePath: "../passport-server/public/semaphore-artifacts/16.zkey"
  })
  await testSingleUser();
}

runLoadTest().then(() => {
  console.log("finished running load test");
  process.exit(0);
}).catch(e => {
  console.log("error running load test");
  console.log(e);
});