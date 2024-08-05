import { ZupassAPI } from "./api";
import { postWindowMessage, WindowMessageType } from "./protocol";
import { createAPIClient } from "./proxy";
import { ZupassAPISchema } from "./schema";
import { Zapp } from "./zapp";

const clients = new WeakMap<ZupassAPI, Client>();

interface Client {
  element: HTMLElement;
  zapp: Zapp;
  port: MessagePort;
  serial: number;
  pending: Record<
    number,
    { resolve: (result: unknown) => void; reject: (reason: unknown) => void }
  >;
}

export function connect(
  zapp: Zapp,
  element: HTMLElement,
  zupassUrl = "https://zupass.org"
): Promise<ZupassAPI> {
  // Will throw if the URL is invalid
  const normalizedUrl = new URL(zupassUrl);

  const shadow = element.attachShadow({ mode: "closed" });
  const iframe = document.createElement("iframe");
  const sandboxAttr = document.createAttribute("sandbox");
  sandboxAttr.value =
    "allow-same-origin allow-scripts allow-popups allow-modals";
  iframe.attributes.setNamedItem(sandboxAttr);
  iframe.src = zupassUrl;

  return new Promise<ZupassAPI>((resolve, _reject) => {
    /**
     * @todo timeout?
     * @todo iframe loads are fake, maybe poll to see if contentwindow exists?
     */
    iframe.addEventListener("load", () => {
      const chan = new MessageChannel();
      chan.port2.start();
      chan.port2.addEventListener(
        "message",
        (ev: MessageEvent) => {
          if (ev.data.type === "zupass-client-ready") {
            const handle = createAPIClient(
              ZupassAPISchema,
              ZupassAPISchema.shape
            );
            clients.set(handle, {
              element,
              zapp,
              port: chan.port2,
              serial: 0,
              pending: {}
            });
            chan.port2.addEventListener("message", (ev: MessageEvent) => {
              if (ev.data.type === "zupass-client-invoke-result") {
                console.log(ev.data);
                clients
                  .get(handle)
                  ?.pending[ev.data.serial]?.resolve(ev.data.result);
              }
            });
            resolve(handle);
          }
        },
        { once: true }
      );
      if (iframe.contentWindow) {
        postWindowMessage(
          iframe.contentWindow,
          {
            type: WindowMessageType.ZUPASS_CLIENT_CONNECT,
            zapp
          },
          normalizedUrl.origin,
          [chan.port1]
        );
      }
    });
    shadow.appendChild(iframe);
  });
}

export function invoke(
  handle: ZupassAPI,
  fn: string,
  args: unknown
): Promise<unknown> {
  console.log(handle);
  const client = clients.get(handle);
  if (!client) {
    throw new Error("zupass client not connected");
  }
  const serial = client.serial++;
  const promise = new Promise((resolve, reject) => {
    client.pending[serial] = { resolve, reject };
    client.port.postMessage({
      type: "zupass-client-invoke",
      fn,
      args,
      serial
    });
  });
  return promise;
}
