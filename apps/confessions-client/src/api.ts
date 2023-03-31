import { useEffect, useState } from "react";
import { CONFESSIONS_SERVER_URL } from "../src/util";

export async function postConfession(
    semaphoreGroupUrl: string,
    confession: string,
    pcdStr: string
): Promise<Response> {
  const parsedPcd = JSON.parse(decodeURIComponent(pcdStr));

  const request = {
    semaphoreGroupUrl,
    confession,
    proof: parsedPcd.pcd
  };
  const url = `${CONFESSIONS_SERVER_URL}confessions`;

  return await fetch(url, {
    method: "POST",
    body: JSON.stringify(request),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}

export async function listConfessions(
  page: number,
  limit: number
): Promise<any> {
  const query = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  }).toString();
  const url = `${CONFESSIONS_SERVER_URL}confessions?${query}`;
  const res = await fetch(url);

  if (!res.ok) return null;
  return await res.json();
}

export function useListConfessions(page: number, limit: number) {
  const [confessions, setConfessions] = useState<any | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const doLoad = async () => {
      try {
        setLoading(true);
        const confessions = await listConfessions(page, limit);
        setConfessions(confessions);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    doLoad();
  }, [page, limit]);

  return { confessions, error, loading };
}
