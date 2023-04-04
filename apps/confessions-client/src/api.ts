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

export async function login(
  semaphoreGroupUrl: string,
  pcdStr: string
): Promise<any> {
  const parsedPcd = JSON.parse(decodeURIComponent(pcdStr));

  const request = {
    semaphoreGroupUrl,
    proof: parsedPcd.pcd
  };
  const url = `${CONFESSIONS_SERVER_URL}login`;

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
  accessToken: string | null,
  page: number,
  limit: number
): Promise<any> {
  if (!accessToken) return null;

  const query = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  }).toString();
  const url = `${CONFESSIONS_SERVER_URL}confessions?${query}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) return null;
  return await res.json();
}
