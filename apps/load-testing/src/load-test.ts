import { passportEncrypt } from "@pcd/passport-crypto";
import { IssuedPCDsRequest } from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { uploadEncryptedStorage } from "./api/endToEndEncryptionApi";
import { requestIssuedPCDs } from "./api/issuedPCDs";
import { requestLoginCode, submitNewUser } from "./api/user";
import { Config, getLoadTestData, TestData, TestRuntimeData } from "./setup";

export interface SingleUserData {
  encryptionKey: string;
  identity: Identity;
  email: string;
  salt: string;
  serializedIdentityProof: SerializedPCD<SemaphoreSignaturePCD>;
}

async function dataToSingleUserDatas(
  data: TestData
): Promise<SingleUserData[]> {
  let datas: SingleUserData[] = data.setupData.users.map(
    (u): SingleUserData => {
      return {
        email: u.email,
        encryptionKey: u.encryptionKey,
        identity: new Identity(u.serializedIdentity),
        salt: u.salt,
        serializedIdentityProof: u.serializedIdentityProof
      };
    }
  );

  return datas;
}

export async function testSingleUser(
  runtimeData: TestRuntimeData,
  data: SingleUserData
) {
  const code: string | undefined = await requestLoginCode(
    data.email,
    data.identity.commitment.toString(),
    true
  );
  const newUserResponse = await submitNewUser(
    data.email,
    code,
    data.identity.commitment.toString(),
    data.salt
  );
  const user = await newUserResponse.json();
  console.log("logged in as user", user);
  const request: IssuedPCDsRequest = {
    userProof: data.serializedIdentityProof
  };

  const userLoop = async () => {
    console.log("getting issued pcds");
    const issuedPCDs = await requestIssuedPCDs(request);
    console.log("get issued pcds", issuedPCDs);
    console.log("saving e2ee data");
    const encryptedStorage = await passportEncrypt(
      JSON.stringify({
        a: "b"
      }),
      data.encryptionKey
    );

    await uploadEncryptedStorage(data.encryptionKey, encryptedStorage);
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

  const config: Config = {
    userCount: 5
  };

  const loadTestData = await getLoadTestData(config);

  console.log(JSON.stringify(loadTestData.setupData, null, 2));

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
