import { useEffect, useState } from "react";
import { requestUser } from "./api/requestUser";
import {
  PCDpassUserJson,
  UserResponseValue,
  ZupassUserJson
} from "./RequestTypes";
import { User } from "./zuzalu";

export function useFetchUser(
  passportServerUrl: string,
  isZuzalu: boolean,
  uuid?: string
) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const doLoad = async () => {
      if (uuid == undefined) {
        setUser(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const userResult = await requestUser(passportServerUrl, isZuzalu, uuid);
      setLoading(false);

      if (userResult.success) {
        setUser(userResult.value);
      } else {
        if (userResult.error.userMissing) {
          setError(`no user with id '${uuid}'`);
        } else {
          setError(userResult.error.errorMessage);
        }
      }
    };

    doLoad();
  }, [isZuzalu, passportServerUrl, uuid]);

  return { user, error, loading };
}

export function toPCDpassUser(user: UserResponseValue) {
  return user as PCDpassUserJson;
}

export function toZupassUser(user: UserResponseValue) {
  return user as ZupassUserJson;
}
