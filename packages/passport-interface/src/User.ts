import { useEffect, useState } from "react";
import { User } from "./zuzalu";

export async function fetchUser(
  passportServerUrl: string,
  uuid: string
): Promise<User | null> {
  // TODO: use consistent environment variables.
  const base = passportServerUrl + (passportServerUrl.endsWith("/") ? "" : "/");
  const url = base + "zuzalu/participant/" + uuid;
  console.log(`Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) return null;
  return (await res.json()) as User;
}

export function useFetchUser(passportServerUrl: string, uuid?: string) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const doLoad = async () => {
      if (uuid == undefined) {
        setUser(null);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const user = await fetchUser(passportServerUrl, uuid);
        setUser(user);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    doLoad();
  }, [passportServerUrl, uuid]);

  return { user, error, loading };
}
