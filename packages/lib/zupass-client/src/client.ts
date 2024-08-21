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

/**
 * There can, in principle, be multiple active clients at the same time.
 * This could be used to allow a Zapp to connect to multiple wallets
 * simultaneously, for example.
 *
 * We use a WeakMap to store private data associated with each client, with
 * only the ZupassAPI proxy object exposed to the caller. The WeakMap will
 * garbage-collect the private data associated with a client when the ZupassAPI
 * proxy object is no longer referenced anywhere.
 */
const clients = new WeakMap<ZupassAPI, Client>();

interface Client {
  // The port used to communicate with the client
  port: MessagePort;
  // The next serial number to use for an RPC request
  serial: number;
  // The set of pending RPC requests, mapping serial numbers to promise
  // resolve/reject functions
  pending: Record<
    number,
    { resolve: (result: unknown) => void; reject: (reason: unknown) => void }
  >;
}

/**
 * A hosted Zupass instance, as created by the connect function.
 */
interface HostedZupass {
  iframe: HTMLIFrameElement;
  shadow: ShadowRoot;
  dialog: HTMLDialogElement;
}

/**
 * Create a hosted Zupass instance inside an iframe.
 * The iframe is hosted in a dialog, which can be displayed modally when the
 * Zupass instance requires user interaction.
 *
 * @param element The element to host the Zupass instance in
 * @param normalizedUrl The URL to host the Zupass instance at
 * @returns A hosted Zupass instance
 */
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
  // Close the dialog if the user clicks outside of it
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

  // Style the dialog backdrop
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

  // Create a container for the iframe
  const container = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "100%";
  dialog.appendChild(container);

  // Create a shadow DOM for the iframe
  // By placing the iframe in a shadow DOM, we can avoid it being styled by the
  // parent document. Right now we're setting the shadow DOM to "open" mode so
  // that it's easy to inspect the shadow DOM content in the browser devtools.
  // However, in the future we should consider setting the shadow DOM to "closed"
  // mode to prevent the parent document JavaScript from having any access to
  // iframe at all. This is not strictly necessary, since the iframe is hosted
  // in a separate origin, but it may be a good precaution.
  const shadow = container.attachShadow({ mode: "open" });

  element.innerHTML = "";
  element.appendChild(dialog);
  const iframe = document.createElement("iframe");
  const sandboxAttr = document.createAttribute("sandbox");
  // These sandbox attributes give the iframe permission to do various things.
  // These should be reviewed as some may be unnecessary, and the narrowest set
  // of permissions should be used.
  sandboxAttr.value =
    "allow-same-origin allow-scripts allow-popups allow-modals allow-forms";
  iframe.attributes.setNamedItem(sandboxAttr);
  iframe.style.borderWidth = "0px";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.src = normalizedUrl.toString();

  return { iframe, shadow, dialog };
}

/**
 * The main event loop for receiving messages from a hosted Zupass instance.
 *
 * The event loop has two stages. In the first stage, the only messages we
 * expect are those confirming that Zupass is ready, that Zupass requires user
 * interaction, or that user interaction is no longer required. This allows
 * Zupass to prompt the user to sign in before indicating that it's ready.
 *
 * In the second stage, we process the full set of RPC messages.
 *
 * @param dialog The dialog element hosting the Zupass instance
 * @param port The message port used to communicate with the Zupass instance
 * @param resolve The function to call when the Zupass instance is ready
 */
function* mainForEmbeddedZupass(
  dialog: HTMLDialogElement,
  port: MessagePort,
  resolve: (handle: ZupassAPI) => void
): Generator<undefined, void, RPCMessage> {
  let handle: ZupassAPI | undefined;
  // Begin by negotiating the connection.
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

  // We're now connected, so process the full set of RPC messages.
  while (true) {
    const event = yield;
    console.log(`RECEIVED ${event.type}`);
    // Receive the result of an RPC invocation
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

/**
 * The main event loop for receiving messages from Zupass when Zupass is
 * hosting the Zapp. Unlike the main event loop for a hosted Zupass instance,
 * we don't need to show or hide the dialog, since Zupass can directly display
 * modal dialogs in front of the Zapp.
 *
 * @param port The message port used to communicate with the Zapp
 * @param resolve The function to call when the Zapp is ready
 */
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

/**
 * As a hosted Zapp, wait for Zupass to initiate connection.
 *
 * @param zapp Basic details of our Zapp
 * @param zupassUrl The URL of the Zupass instance
 * @returns A ZupassAPI handle that can be used to invoke methods on Zupass
 */
export function listen(
  zapp: Zapp,
  zupassUrl = "https://zupass.org"
): Promise<ZupassAPI> {
  const normalizedUrl = new URL(zupassUrl);
  if (window.self === window.top) {
    throw new Error("listen() can only be called from within an iframe");
  }

  return new Promise<ZupassAPI>((resolve, _reject) => {
    window.onmessage = (ev: MessageEvent): void => {
      console.log(ev);
      // Make sure that the parent iframe is actually Zupass
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

/**
 * Connect to an embedded Zupass instance.
 *
 * @param zapp Basic details of our Zapp
 * @param element The element to host the Zupass instance in
 * @param zupassUrl The URL of the Zupass instance
 * @returns A ZupassAPI handle that can be used to invoke methods on Zupass
 */
export function connect(
  zapp: Zapp,
  element: HTMLElement,
  zupassUrl = "https://zupass.org"
): Promise<ZupassAPI> {
  // Will throw if the URL is invalid
  const normalizedUrl = new URL(zupassUrl);
  const { iframe, shadow, dialog } = createHostedZupass(element, normalizedUrl);

  return new Promise<ZupassAPI>((resolve, _reject) => {
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

/**
 * Make a remote procedure call to Zupass.
 *
 * @param handle A handle to the Zupass instance
 * @param fn The name of the method to invoke
 * @param args The arguments to pass to the method
 * @returns A promise that resolves to the result of the method call
 */
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
