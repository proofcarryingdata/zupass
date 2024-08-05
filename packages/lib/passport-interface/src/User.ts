import { useEffect, useState } from "react";
import { requestUser } from "./api/requestUser.js";
import { User } from "./zuzalu.js";

export function useFetchUser(
  zupassServerUrl: string,
  isZuzalu: boolean,
  uuid?: string
): { user: User | null; error: string | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const doLoad = async (): Promise<void> => {
      if (uuid === undefined) {
        setUser(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const userResult = await requestUser(zupassServerUrl, uuid);
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
  }, [isZuzalu, zupassServerUrl, uuid]);

  return { user, error, loading };
}
