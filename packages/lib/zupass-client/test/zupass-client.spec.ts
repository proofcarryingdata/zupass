import { POD } from "@pcd/pod";
import { p } from "@pcd/podspec";
import { assert, expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import crypto from "crypto";
import "mocha";
import { ZodError } from "zod";
import {
  postRPCMessage,
  RPCMessage,
  RPCMessageSchema,
  RPCMessageType
} from "../src/index";
import { ZupassRPCClient } from "../src/rpc_client";
import { connectedClient, mockDialog } from "./utils";

function generateRandomHex(byteLength: number): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return randomBytes.toString("hex");
}

use(chaiAsPromised);

describe("zupass-client should work", async function () {
  it("zupass-client should throw when not connected", async function () {
    const chan = new MessageChannel();

    const client = new ZupassRPCClient(chan.port2, mockDialog);

    expect(
      client.identity.getSemaphoreV3Commitment()
    ).to.eventually.be.rejectedWith("Client is not connected");
  });

  it("zupass-client should connect", async function () {
    const chan = new MessageChannel();

    const client = new ZupassRPCClient(chan.port2, mockDialog);
    expect(client.isConnected()).to.be.false;

    client.start(() => {
      // This is called when the connection is established
      expect(client.isConnected()).to.be.true;
    });

    postRPCMessage(chan.port1, {
      type: RPCMessageType.ZUPASS_CLIENT_READY
    });

    // Waiting gives the client time to process the READY
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(client.isConnected()).to.be.true;
  });

  it("zupass-client should send requests and receive responses", async function () {
    const { chan, client } = await connectedClient();

    chan.port1.onmessage = (event): void => {
      const message = RPCMessageSchema.parse(event.data);
      assert(message.type === RPCMessageType.ZUPASS_CLIENT_INVOKE);
      assert(message.fn === "identity.getSemaphoreV3Commitment");
      assert(message.args.length === 0);
      assert(message.serial === 1);
    };

    const promise = client.identity.getSemaphoreV3Commitment();

    postRPCMessage(chan.port1, {
      type: RPCMessageType.ZUPASS_CLIENT_INVOKE_RESULT,
      serial: 1,
      result: BigInt("1")
    });

    expect(promise).to.eventually.equal(BigInt("1"));
  });

  it("zupass-client should throw an exception if an incorrect response is received", async function () {
    const { chan, client } = await connectedClient();

    chan.port1.onmessage = (event): void => {
      const message = RPCMessageSchema.parse(event.data);
      assert(message.type === RPCMessageType.ZUPASS_CLIENT_INVOKE);
      assert(message.fn === "identity.getSemaphoreV3Commitment");
      assert(message.args.length === 0);
      assert(message.serial === 1);
    };

    const promise = client.identity.getSemaphoreV3Commitment();

    postRPCMessage(chan.port1, {
      type: RPCMessageType.ZUPASS_CLIENT_INVOKE_RESULT,
      serial: 1,
      result: "INCORRECT" // Not a BigInt
    });

    await expect(promise).to.be.rejectedWith(ZodError);
  });

  it("should notify when a subscription is updated", async function () {
    const { chan, client } = await connectedClient();

    const pod = POD.sign(
      {
        testEntry: { type: "string", value: "test" }
      },
      generateRandomHex(32)
    );
    const serializedPod = pod.serialize();

    const serializedQuery = p
      .pod({
        testEntry: p.string()
      })
      .serialize();

    const subscriptionId = client.pod.subscribe(serializedQuery);

    postRPCMessage(chan.port1, {
      type: RPCMessageType.ZUPASS_CLIENT_INVOKE_RESULT,
      serial: 1,
      result: "test" // Subscription ID is "test"
    } satisfies RPCMessage);

    // Wait for the RPC call creating the subscription to complete
    await expect(subscriptionId).to.eventually.equal("test");

    const waitForUpdatePromise = new Promise((resolve) => {
      client.on("subscription-update", (result) => {
        resolve(result);
      });
    });

    postRPCMessage(chan.port1, {
      type: RPCMessageType.ZUPASS_CLIENT_SUBSCRIPTION_UPDATE,
      subscriptionSerial: 1,
      subscriptionId: "test",
      update: [serializedPod]
    } satisfies RPCMessage);

    // Wait for the subscription update to be received
    await expect(waitForUpdatePromise).to.eventually.eql({
      subscriptionId: "test",
      update: [serializedPod]
    });
  });
});
