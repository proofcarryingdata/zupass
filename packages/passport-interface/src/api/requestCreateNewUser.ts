import { HexString } from "@pcd/passport-crypto";
import urlJoin from "url-join";
import {
  CreateNewUserRequest,
  PCDpassUserJson,
  UserResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Once the user has verified their token, they can create a new
 * user on the backend using this function.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestCreateNewUser(
  passportServerUrl: string,
  isZuzalu: boolean,
  email: string,
  token: string,
  commitment: string,
  salt: HexString | null
): Promise<NewUserResult> {
  return requestCreateNewUserWithPath(
    passportServerUrl,
    email,
    token,
    commitment,
    salt,
    isZuzalu ? "/zuzalu/new-participant" : "/pcdpass/new-participant"
  );
}

async function requestCreateNewUserWithPath(
  passportServerUrl: string,
  email: string,
  token: string,
  commitment: string,
  salt: HexString | null,
  urlPath: string
): Promise<NewUserResult> {
  return httpPostSimple(
    urlJoin(passportServerUrl, urlPath),
    async (resText) => ({
      value: JSON.parse(resText) as PCDpassUserJson,
      success: true
    }),
    {
      email,
      token,
      commitment,
      salt
    } satisfies CreateNewUserRequest
  );
}

export type NewUserResult = APIResult<UserResponseValue>;
