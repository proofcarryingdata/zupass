import { ZupassAPI } from "./api_wrapper";
import { postWindowMessage, WindowMessageType } from "./protocol";
import { ZupassRPCClient } from "./rpc_client";
import { Zapp } from "./zapp";

class DialogControllerImpl implements DialogController {
  #dialog: HTMLDialogElement;

  constructor(dialog: HTMLDialogElement) {
    this.#dialog = dialog;
  }

  public show(): void {
    this.#dialog.showModal();
  }

  public close(): void {
    this.#dialog.close();
  }
}

export interface DialogController {
  show(): void;
  close(): void;
}

/**
 * Connects to Zupass and returns a ZupassAPI object.
 *
 * @param zapp - The Zapp iniating the connection.
 * @param element - The element to attach the Zupass iframe to.
 * @param zupassUrl - The URL of the Zupass instance to connect to.
 * @returns A promise that resolves to a ZupassAPI object.
 */
export function connect(
  zapp: Zapp,
  element: HTMLElement,
  zupassUrl = "https://zupass.org"
): Promise<ZupassAPI> {
  // Will throw if the URL is invalid
  const normalizedUrl = new URL(zupassUrl);

  // Create a dialog to hold the Zupass iframe
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

  // Add a backdrop to the dialog
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
  // "Open" shadow DOM allows inspection of the iframe's DOM.
  // At a later date we may want to make this "closed" in order to restrict
  // what the parent page can access.
  const shadow = container.attachShadow({ mode: "open" });

  element.innerHTML = "";
  element.appendChild(dialog);

  // Create the iframe that will host Zupass
  const iframe = document.createElement("iframe");
  const sandboxAttr = document.createAttribute("sandbox");
  sandboxAttr.value =
    "allow-same-origin allow-scripts allow-popups allow-modals allow-forms";
  iframe.attributes.setNamedItem(sandboxAttr);
  iframe.style.borderWidth = "0px";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.src = normalizedUrl.toString();

  return new Promise<ZupassAPI>((resolve, _reject) => {
    iframe.addEventListener("load", async () => {
      // Create a new MessageChannel to communicate with the iframe
      const chan = new MessageChannel();

      // Create a new RPC client
      const client = new ZupassRPCClient(
        chan.port2,
        new DialogControllerImpl(dialog)
      );
      // Tell the RPC client to start. It will call the function we pass in
      // when the connection is ready, at which point we can resolve the
      // promise and return the API wrapper to the caller.
      // See below for how the other port of the message channel is sent to
      // Zupass.
      client.start(() => {
        resolve(new ZupassAPI(client));
      });

      if (iframe.contentWindow) {
        // @todo Blink (and maybe Webkit) will discard messages if there's no
        // handler yet, so we need to wait a bit and/or retry until Zupass is
        // ready
        // Zupass takes a few seconds to load, so waiting isn't a bad solution
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 1000);
        });
        // Send the other port of the message channel to Zupass
        postWindowMessage(
          iframe.contentWindow,
          {
            type: WindowMessageType.ZUPASS_CLIENT_CONNECT,
            zapp
          },
          "*",
          // Our RPC client has port2, send port1 to Zupass
          [chan.port1]
        );
      } else {
        console.log("no content window!");
      }
    });
    shadow.appendChild(iframe);
  });
}
