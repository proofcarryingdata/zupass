import {
  passportDecrypt,
  passportEncrypt,
  PCDCrypto
} from "@pcd/passport-crypto";
import {
  LoadE2EERequest,
  LoadE2EEResponse,
  SaveE2EERequest
} from "@pcd/passport-interface";
import { expect } from "chai";
import "chai-spies";
import "mocha";
import httpMocks from "node-mocks-http";
import { PCDPass } from "../../src/types";

export async function testUserSync(application: PCDPass): Promise<void> {
  const crypto = await PCDCrypto.newInstance();
  const syncKey = await crypto.generateRandomKey();

  const { e2eeService } = application.services;

  const loadRequest: LoadE2EERequest = {
    blobKey: syncKey
  };

  const firstLoadResponse = httpMocks.createResponse();
  await e2eeService.handleLoad(loadRequest, firstLoadResponse);
  expect(firstLoadResponse.statusCode).to.eq(404);

  const plaintextData = {
    test: "test",
    one: 1
  };
  const encryptedData = await passportEncrypt(
    JSON.stringify(plaintextData),
    syncKey
  );

  const saveRequest: SaveE2EERequest = {
    blobKey: syncKey,
    encryptedBlob: JSON.stringify(encryptedData)
  };

  const saveResponse = httpMocks.createResponse();
  await e2eeService.handleSave(saveRequest, saveResponse);
  expect(saveResponse.statusCode).to.eq(200);

  const secondLoadResponse = httpMocks.createResponse();
  await e2eeService.handleLoad(loadRequest, secondLoadResponse);
  const loadResponseJson =
    secondLoadResponse._getJSONData() as LoadE2EEResponse;
  expect(loadResponseJson).to.haveOwnProperty("encryptedStorage");
  const decrypted: string = await passportDecrypt(
    loadResponseJson.encryptedStorage,
    syncKey
  );
  expect(JSON.parse(decrypted)).to.deep.eq(plaintextData);
}
