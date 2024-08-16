import { ZupassAPI } from "./api";
import {
  postRPCMessage,
  postWindowMessage,
  RPCMessage,
  RPCMessageSchema,
  RPCMessageType,
  WindowMessageType
} from "./protocol";
import { createAPIClient } from "./proxy";
import { ZupassAPISchema } from "./schema";
import { Zapp } from "./zapp";

const clients = new WeakMap<ZupassAPI, Client>();

interface Client {
  port: MessagePort;
  serial: number;
  pending: Record<
    number,
    { resolve: (result: unknown) => void; reject: (reason: unknown) => void }
  >;
}

interface HostedZupass {
  iframe: HTMLIFrameElement;
  shadow: ShadowRoot;
  dialog: HTMLDialogElement;
}

function createHostedZupass(
  element: HTMLElement,
  normalizedUrl: URL
): HostedZupass {
  const dialog = document.createElement("dialog");
  dialog.style.borderWidth = "0px";
  dialog.style.borderRadius = "16px";
  dialog.style.padding = "0px";
  dialog.style.backgroundColor = "#19473f";
  dialog.style.width = "90vw";
  dialog.style.maxWidth = "600px";
  dialog.style.height = "90vh";
  dialog.classList.add("zupass-dialog");
  dialog.addEventListener("click", (e) => {
    const dialogDimensions = dialog.getBoundingClientRect();
    if (
      e.clientX < dialogDimensions.left ||
      e.clientX > dialogDimensions.right ||
      e.clientY < dialogDimensions.top ||
      e.clientY > dialogDimensions.bottom
    ) {
      dialog.close();
    }
  });

  const style = document.createElement("style");
  style.textContent = `.zupass-dialog::backdrop {
  position: fixed;
  top: 0px;
  right: 0px;
  bottom: 0px;
  left: 0px;
  background: rgba(0, 0, 0, 0.3);;
  }`;
  dialog.appendChild(style);

  const container = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "100%";
  dialog.appendChild(container);
  const shadow = container.attachShadow({ mode: "open" });

  element.innerHTML = "";
  element.appendChild(dialog);
  const iframe = document.createElement("iframe");
  const sandboxAttr = document.createAttribute("sandbox");
  sandboxAttr.value =
    "allow-same-origin allow-scripts allow-popups allow-modals allow-forms";
  iframe.attributes.setNamedItem(sandboxAttr);
  iframe.style.borderWidth = "0px";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.src = normalizedUrl.toString();

  return { iframe, shadow, dialog };
}

function* mainForEmbeddedZupass(
  dialog: HTMLDialogElement,
  port: MessagePort,
  resolve: (handle: ZupassAPI) => void
): Generator<undefined, void, RPCMessage> {
  let handle: ZupassAPI | undefined;
  while (true) {
    const event = yield;
    if (event.type === RPCMessageType.ZUPASS_CLIENT_READY) {
      handle = createAPIClient(ZupassAPISchema, ZupassAPISchema.shape);
      clients.set(handle, {
        port,
        serial: 0,
        pending: {}
      });
      resolve(handle);
      break;
    } else if (event.type === RPCMessageType.ZUPASS_CLIENT_SHOW) {
      dialog.showModal();
    } else if (event.type === RPCMessageType.ZUPASS_CLIENT_HIDE) {
      dialog.close();
    }
  }

  while (true) {
    const event = yield;
    console.log(`RECEIVED ${event.type}`);
    if (event.type === RPCMessageType.ZUPASS_CLIENT_INVOKE_RESULT) {
      clients.get(handle)?.pending[event.serial]?.resolve(event.result);
    } else if (event.type === RPCMessageType.ZUPASS_CLIENT_INVOKE_ERROR) {
      clients
        .get(handle)
        ?.pending[event.serial]?.reject(new Error(event.error));
    } else if (event.type === RPCMessageType.ZUPASS_CLIENT_SHOW) {
      dialog.showModal();
    } else if (event.type === RPCMessageType.ZUPASS_CLIENT_HIDE) {
      dialog.close();
    }
  }
}

function* mainForEmbeddedZapp(
  port: MessagePort,
  resolve: (handle: ZupassAPI) => void
): Generator<undefined, void, RPCMessage> {
  let handle: ZupassAPI | undefined;
  while (true) {
    const event = yield;
    console.log(`RECEIVED ${event.type}`);
    if (event.type === RPCMessageType.ZUPASS_CLIENT_READY) {
      handle = createAPIClient(ZupassAPISchema, ZupassAPISchema.shape);
      clients.set(handle, {
        port,
        serial: 0,
        pending: {}
      });
      resolve(handle);
      break;
    }
  }

  while (true) {
    const event = yield;
    console.log(`RECEIVED ${event.type}`);
    if (event.type === RPCMessageType.ZUPASS_CLIENT_INVOKE_RESULT) {
      clients.get(handle)?.pending[event.serial]?.resolve(event.result);
    } else if (event.type === RPCMessageType.ZUPASS_CLIENT_INVOKE_ERROR) {
      clients
        .get(handle)
        ?.pending[event.serial]?.reject(new Error(event.error));
    }
  }
}

export function listen(
  zapp: Zapp,
  zupassUrl = "https://zupass.org"
): Promise<ZupassAPI> {
  const normalizedUrl = new URL(zupassUrl);
  if (window.self === window.top) {
    throw new Error("Listen can only be called from within an iframe");
  }

  return new Promise<ZupassAPI>((resolve, _reject) => {
    window.onmessage = (ev: MessageEvent): void => {
      console.log(ev);
      if (ev.origin !== normalizedUrl.origin) {
        console.error(
          `Unexpected origin: ${ev.origin} != ${normalizedUrl.origin}`
        );
        return;
      }

      if (ev.data.type === WindowMessageType.ZUPASS_HOST_CONNECT) {
        postRPCMessage(ev.ports[0], {
          type: RPCMessageType.ZUPASS_CLIENT_CONNECT,
          zapp
        });
        const port = ev.ports[0];
        const eventLoop = mainForEmbeddedZapp(port, resolve);
        eventLoop.next();

        port.onmessage = (ev: MessageEvent): void => {
          const msg = RPCMessageSchema.safeParse(ev.data);
          console.log(msg);
          if (msg.success) {
            eventLoop.next(msg.data);
          } else {
            console.log("Got unexpected message: ", ev);
          }
        };
      }
    };
  });
}

export function connect(
  zapp: Zapp,
  element: HTMLElement,
  zupassUrl = "https://zupass.org"
): Promise<ZupassAPI> {
  // Will throw if the URL is invalid
  const normalizedUrl = new URL(zupassUrl);
  const { iframe, shadow, dialog } = createHostedZupass(element, normalizedUrl);

  return new Promise<ZupassAPI>((resolve, _reject) => {
    /**
     * @todo timeout?
     */
    iframe.addEventListener("load", async () => {
      const chan = new MessageChannel();
      chan.port2.start();
      const eventLoop = mainForEmbeddedZupass(dialog, chan.port2, resolve);
      eventLoop.next();

      chan.port2.addEventListener("message", (ev: MessageEvent) => {
        const msg = RPCMessageSchema.safeParse(ev.data);
        if (msg.success) {
          eventLoop.next(msg.data);
        } else {
          console.log("Got unexpected message: ", ev);
        }
      });

      if (iframe.contentWindow) {
        // @todo Blink (and maybe Webkit) will discard messages if there's no
        // handler yet, so we need to wait a bit and/or retry until Zupass is
        // ready
        // Zupass takes a few seconds to load, so waiting isn't a bad solution
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 1000);
        });
        postWindowMessage(
          iframe.contentWindow,
          {
            type: WindowMessageType.ZUPASS_CLIENT_CONNECT,
            zapp
          },
          "*",
          [chan.port1]
        );
      } else {
        console.log("no content window!");
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
