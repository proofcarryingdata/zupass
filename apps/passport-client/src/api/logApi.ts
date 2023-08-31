import { appConfig } from "../appConfig";

export async function logToServer(value: object): Promise<void> {
  const url = `${appConfig.passportServer}/client-log`;

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(value)
  });
}
