import { CONFESSIONS_SERVER_URL } from "../src/util";

export async function postConfession(
    semaphoreGroupUrl: string,
    confession: string,
    proof: string
): Promise<void> {
  const request = {
    semaphoreGroupUrl,
    confession,
    proof
  };
  const url = `${CONFESSIONS_SERVER_URL}confessions`;

  await fetch(url, {
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
): Promise<void> {
  const query = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  }).toString();
  const url = `${CONFESSIONS_SERVER_URL}confessions?${query}`;
  await fetch(url);
}
