import { expect } from "chai";
import { DialogController, postRPCMessage, RPCMessageType } from "../src";
import { ZupassRPCClient } from "../src/rpc_client";

export const mockDialog: DialogController = {
  show: () => {},
  close: () => {}
};

export async function connectedClient(): Promise<{
  chan: MessageChannel;
  client: ZupassRPCClient;
}> {
  const chan = new MessageChannel();
  const client = new ZupassRPCClient(chan.port2, mockDialog);
  client.start(() => {
    // This is called when the connection is established
    expect(client.isConnected()).to.be.true;
  });

  postRPCMessage(chan.port1, {
    type: RPCMessageType.ZUPASS_CLIENT_READY
  });

  // Waiting gives the client time to process the READY
  await new Promise((resolve) => setTimeout(resolve, 100));

  return { chan, client };
}
