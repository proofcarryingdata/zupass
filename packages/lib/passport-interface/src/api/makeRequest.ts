import { getErrorMessage, sleep } from "@pcd/util";
import urlJoin from "url-join";
import { APIResult, GetResultValue, ResultMapper } from "./apiResult";
import { POST } from "./constants";

/**
 * Wrapper of {@link httpRequest} that sends a GET request.
 */
export async function httpGet<T extends APIResult<unknown, unknown>>(
  url: string,
  opts: ResultMapper<T>,
  query?: object
): Promise<T> {
  return httpRequest<T>(
    urlJoin(
      url,
      "?" + new URLSearchParams((query as Record<string, string>) ?? {})
    ),
    opts
  );
}

/**
 * Wrapper of {@link httpRequest} that sends a POST request.
 */
export async function httpPost<T extends APIResult<unknown, unknown>>(
  url: string,
  opts: ResultMapper<T>,
  postBody?: object
): Promise<T> {
  return httpRequest<T>(url, opts, postBody);
}

/**
 * Shorthand for a {@link httpGet} whose error type is a string.
 */
export async function httpGetSimple<TResult>(
  url: string,
  onValue: GetResultValue<APIResult<TResult, string>>,
  query?: object
): Promise<APIResult<TResult, string>> {
  return httpGet<APIResult<TResult, string>>(
    url,
    {
      onValue,
      onError: async (resText) => ({ error: resText, success: false })
    },
    query
  );
}

/**
 * Shorthand for a {@link httpPost} whose error type is a string.
 */
export async function httpPostSimple<TResult>(
  url: string,
  onValue: GetResultValue<APIResult<TResult, string>>,
  postBody?: object
): Promise<APIResult<TResult, string>> {
  return httpPost<APIResult<TResult, string>>(
    url,
    {
      onValue,
      onError: async (resText) => ({ error: resText, success: false })
    },
    postBody
  );
}

/**
 * DEVELOPMENT ONLY!
 *
 * Set this to a value like 5000 to delay all http requests by 5 seconds.
 * Useful for testing intermediate loading states in the Zupass application.
 */
const throttleMs = 0;

/**
 * Sends a non-blocking HTTP request to the given URL, either a POST
 * or a GET, with the given body, and converts it into a {@link APIResult}.
 *
 * Never rejects.
 */
async function httpRequest<T extends APIResult<unknown, unknown>>(
  url: string,
  opts: ResultMapper<T>,
  postBody?: object
): Promise<T> {
  await sleep(throttleMs);

  let requestOptions: RequestInit = {
    method: "GET"
  };

  if (postBody != null) {
    requestOptions = {
      ...requestOptions,
      ...POST,
      body: JSON.stringify(postBody)
    };
  }

  try {
    // @todo - prevent logspam in the same way we prevent it
    // on the server. otherwise, these show up in test logs.
    console.log(`[FETCH]`, url, requestOptions.method);

    const res = await fetch(url, requestOptions);
    const resText = await res.text();

    if (!res.ok) {
      console.error("error fetching", url, res.status, resText);
      return await opts.onError(resText, res.status);
    }

    return await opts.onValue(resText);
  } catch (e) {
    console.error("error fetching", url, e);

    try {
      return await opts.onError(getErrorMessage(e), undefined);
    } catch (e) {
      console.error("[FETCH] error executing `opts.onError`", e);
      throw e;
    }
  }
}

export async function mapStringError<TValue>(
  resText: string
): Promise<APIResult<TValue, string>> {
  return { error: resText, success: false };
}
