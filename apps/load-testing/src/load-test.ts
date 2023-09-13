import { passportEncrypt } from "@pcd/passport-crypto";
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

export interface SingleUserData {
  encryptionKey: string;
  identity: Identity;
  email: string;
}

async function dataToSingleUserDatas(
  data: LoadTestData
): Promise<SingleUserData[]> {
  let datas: SingleUserData[] = data.setupData.users.map(
    (u): SingleUserData => {
      return {
        email: u.email,
        encryptionKey: u.encryptionKey,
        identity: new Identity(u.serializedIdentity)
      };
    }
  );

  return datas;
}

export async function testSingleUser(
  runtimeData: LoadTestRuntimeData,
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
    data.identity.commitment.toString()
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
              identity: data.identity
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
