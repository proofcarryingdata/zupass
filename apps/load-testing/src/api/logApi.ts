import { SERVER_URL } from "../config";

export async function logToServer(
  eventName: string,
  value: object
): Promise<void> {
  const url = `${SERVER_URL}/client-log`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ name: eventName, ...value })
    });
  } catch (e) {
    console.log("failed to log event to server", e);
  }
}
