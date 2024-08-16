import { getActiveSpan } from "@opentelemetry/api/build/src/trace/context-utils";
import { sleep } from "@pcd/util";

export async function execWithRetry<T>(
  task: () => Promise<T>,
  shouldRetry: (e: unknown) => boolean,
  maxRetries: number
): Promise<T> {
  const span = getActiveSpan();
  const backoffFactorMs = 100;
  let latestError = undefined;

  span?.setAttribute("max_tries", maxRetries);

  for (let i = 0; i <= maxRetries; i++) {
    span?.setAttribute("try_count", i + 1);

    try {
      const result = await task();
      span?.setAttribute("retry_succeeded", true);
      return result;
    } catch (e) {
      latestError = e;
      if (!shouldRetry(e)) {
        break;
      }
    }

    await sleep(backoffFactorMs * (i + 1));
  }

  span?.setAttribute("retry_succeeded", false);
  throw latestError;
}
