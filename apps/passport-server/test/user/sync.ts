import { passportEncrypt, PCDCrypto } from "@pcd/passport-crypto";
import {
  LoadE2EERequest,
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

  const dataToSync = {
    test: "test",
  };
  const encryptedData = await passportEncrypt(
    JSON.stringify(dataToSync),
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
}
