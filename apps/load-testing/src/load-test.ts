import { passportEncrypt, PCDCrypto } from "@pcd/passport-crypto";
import { ISSUANCE_STRING, IssuedPCDsRequest } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { uploadEncryptedStorage } from "./api/endToEndEncryptionApi";
import { requestIssuedPCDs } from "./api/issuedPCDs";
import { requestLoginCode, submitNewUser } from "./api/user";
import {
  getLoadTestData,
  LoadTestConfig,
  LoadTestData,
  LoadTestRuntimeData
} from "./setup";

export interface SingleUserData {}

async function dataToSingleUserDatas(
  data: LoadTestData
): Promise<SingleUserData[]> {
  const datas = [];

  return datas;
}

export async function testSingleUser(
  runtimeData: LoadTestRuntimeData,
  data: SingleUserData
) {
  const email = "ivan" + Math.random() + "@0xparc.org";
  const identity = new Identity();
  const crypto = await PCDCrypto.newInstance();
  const encryptionKey = await crypto.generateRandomKey();
  const code: string | undefined = await requestLoginCode(
    email,
    identity.commitment.toString(),
    true
  );
  const newUserResponse = await submitNewUser(
    email,
    code,
    identity.commitment.toString()
  );
  const user = await newUserResponse.json();
  console.log("logged in as user", user);
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

  const userLoop = async () => {
    console.log("proved that I am a user");
    console.log("getting issued pcds");
    const issuedPCDs = await requestIssuedPCDs(request);
    console.log("get issued pcds", issuedPCDs);
    console.log("saving e2ee data");
    const encryptedStorage = await passportEncrypt(
      JSON.stringify({
        a: "b"
      }),
      encryptionKey
    );

    await uploadEncryptedStorage(encryptionKey, encryptedStorage);
    console.log("saved e2ee data");
  };

  setInterval(() => {
    userLoop();
  }, 5000);
}

export async function runLoadTest() {
  await SemaphoreSignaturePCDPackage.init({
    wasmFilePath: "../passport-server/public/semaphore-artifacts/16.wasm",
    zkeyFilePath: "../passport-server/public/semaphore-artifacts/16.zkey"
  });

  const config: LoadTestConfig = {
    userCount: 5
  };

  const loadTestData = await getLoadTestData(config);

  console.log(loadTestData);

  const singleUserDatas = await dataToSingleUserDatas(loadTestData);

  for (const singleUserData of singleUserDatas) {
    setTimeout(
      () => {
        testSingleUser(loadTestData.runtimeData, singleUserData);
      },
      Math.random() * 1000 * 5
    );
  }
}
