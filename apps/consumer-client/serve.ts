import fs from "node:fs";
import http from "node:http";

// esbuild's built in server servers static files and doesn't allow for
// any form of routing. This is a simple proxy server that forwards
// requests to esbuild's server and returns the index.html if esbuild
// returns a 404.
export default function esbuildServerProxy(
  { host, port, servedir },
  proxyPort
) {
  return http
    .createServer((req, res) => {
      const options = {
        hostname: host,
        port,
        path: req.url,
        method: req.method,
        headers: req.headers
      };

      // Forward each incoming request to esbuild
      const proxyReq = http.request(options, (proxyRes) => {
        // If esbuild returns "not found", send the index.html instead
        if (proxyRes.statusCode === 404) {
          const index = fs.createReadStream(`${servedir}/index.html`);
          return index.pipe(res);
        }

        // Otherwise, forward the response from esbuild to the client
        res.writeHead(proxyRes.statusCode as number, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });

      // Forward the body of the request to esbuild
      req.pipe(proxyReq, { end: true });
    })
    .listen(proxyPort);
}
