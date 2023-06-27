import {
  passportDecrypt,
  passportEncrypt,
  PCDCrypto,
} from "@pcd/passport-crypto";
import {
  LoadE2EERequest,
  LoadE2EEResponse,
  SaveE2EERequest,
  ZuParticipant,
} from "@pcd/passport-interface";
import { default as chai, expect } from "chai";
import "chai-spies";
import "mocha";
import httpMocks from "node-mocks-http";
import { PCDPass } from "../../src/types";

export async function sync(
  application: PCDPass,
  user: ZuParticipant
): Promise<void> {
  const crypto = await PCDCrypto.newInstance();
  const syncKey = await crypto.generateRandomKey();

  const { e2eeService } = application.globalServices;

  const loadRequest: LoadE2EERequest = {
    blobKey: syncKey,
  };

  const firstLoadResponse = httpMocks.createResponse();
  const loadNextFunc = chai.spy.returns(true);
  await e2eeService.handleLoad(loadRequest, firstLoadResponse, loadNextFunc);
  expect(loadNextFunc).to.not.have.been.called();
  expect(firstLoadResponse.statusCode).to.eq(404);

  const plaintextData = {
    test: "test",
    one: 1,
  };
  const encryptedData = await passportEncrypt(
    JSON.stringify(plaintextData),
    syncKey
  );

  const saveRequest: SaveE2EERequest = {
    blobKey: syncKey,
    encryptedBlob: JSON.stringify(encryptedData),
  };

  const saveNextFunc = chai.spy.returns(true);
  const saveResponse = httpMocks.createResponse();
  await e2eeService.handleSave(saveRequest, saveResponse, saveNextFunc);
  expect(saveResponse.statusCode).to.eq(200);

  const secondLoadResponse = httpMocks.createResponse();
  const secondLoadNextFunc = chai.spy.returns(true);
  await e2eeService.handleLoad(
    loadRequest,
    secondLoadResponse,
    secondLoadNextFunc
  );
  const loadResponseJson =
    secondLoadResponse._getJSONData() as LoadE2EEResponse;
  expect(loadResponseJson).to.haveOwnProperty("encryptedStorage");
  const decrypted = await passportDecrypt(
    loadResponseJson.encryptedStorage,
    syncKey
  );
  expect(decrypted).to.deep.eq(plaintextData);
}
