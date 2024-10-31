import cluster from "cluster";
import express, { Request, RequestHandler, Response } from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import process from "process";

/**
 * This middleware is used by the main cluster process to proxy (forward) incoming HTTP
 * requests to the child worker processes, in the case that clustering is enabled.
 *
 * If clustering is not enabled, this middleware is a no-op. The cluster feature is enabled
 * by setting the `ENABLE_CLUSTER` environment variable to `true`.
 *
 * NodeJS allows cluster child processes to 'share' a single port, and automatically load
 * balances incoming requests between the available child processes. Each child process
 * instantiates its own HTTP server, and its own instance of the Passport Server application,
 * with only the parallelizable services running in each child process. *NOT ALL SERVICES* are
 * parallelizable.
 *
 * Thus, for routes that use this proxy middleware, the incoming request is forwarded to one of N
 * child processes, which runs on its own CPU core, processes the request, returns a response to
 * the main cluster process, which then sends the response to the client.
 *
 * @see https://nodejs.org/api/cluster.html
 * @see https://www.npmjs.com/package/http-proxy-middleware
 */
export function clusterProxy(): RequestHandler {
  if (memoizedClusterProxyMiddleware) {
    return memoizedClusterProxyMiddleware;
  }

  const proxyEnabled = process.env.ENABLE_CLUSTER === "true";

  if (!proxyEnabled || cluster.isWorker) {
    return (memoizedClusterProxyMiddleware = ((
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ): void => {
      next();
    }) satisfies RequestHandler);
  }

  const targetPort = getClusterPort();

  const proxyMiddleware = createProxyMiddleware<Request, Response>({
    target: `http://localhost:${targetPort}`,
    changeOrigin: true,
    on: {
      /**
       * Fix bodyParser.
       * See the 'Intercept and manipulate requests' section of https://www.npmjs.com/package/http-proxy-middleware for more details.
       **/
      proxyReq: fixRequestBody
    }
  });

  return (memoizedClusterProxyMiddleware = proxyMiddleware);
}

/**
 * We only need once instance of this cluster proxy middleware - it can be reused by
 * all the routes that need it.
 */
let memoizedClusterProxyMiddleware: RequestHandler | undefined = undefined;

export function getClusterPort(): number {
  const DEFAULT_CLUSTER_PORT = 30002;
  let port = parseInt(
    process.env.CLUSTER_PORT ?? `${DEFAULT_CLUSTER_PORT}`,
    10
  );
  if (isNaN(port)) {
    port = DEFAULT_CLUSTER_PORT;
  }
  return port;
}
