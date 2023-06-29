import { useEffect, useState } from "react";
import { User } from "./zuzalu";

export async function fetchParticipant(
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

export function useFetchParticipant(passportServerUrl: string, uuid?: string) {
  const [participant, setParticipant] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const doLoad = async () => {
      if (uuid == undefined) {
        setParticipant(null);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const participant = await fetchParticipant(passportServerUrl, uuid);
        setParticipant(participant);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    doLoad();
  }, [passportServerUrl, uuid]);

  return { participant, error, loading };
}
