import { ZupassAPI } from "./api_wrapper";
import { postWindowMessage, WindowMessageType } from "./protocol";
import { ZupassRPCClient } from "./rpc_client";
import { Zapp } from "./zapp";

export function connect(
  zapp: Zapp,
  element: HTMLElement,
  zupassUrl = "https://zupass.org"
): Promise<ZupassAPI> {
  // Will throw if the URL is invalid
  const normalizedUrl = new URL(zupassUrl);

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

  return new Promise<ZupassAPI>((resolve, _reject) => {
    /**
     * @todo timeout?
     * @todo iframe loads are fake, maybe poll to see if contentwindow exists?
     */
    iframe.addEventListener("load", async () => {
      const chan = new MessageChannel();

      // Create a new RPC client
      const client = new ZupassRPCClient(chan.port2, dialog);
      // Tell the RPC client to start. It will call the function we pass in
      // when the connection is ready, at which point we can resolve the
      // promise and return the API wrapper to the caller.
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
