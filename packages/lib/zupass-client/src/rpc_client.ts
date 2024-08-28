import { GPCPCDArgs } from "@pcd/gpc-pcd";
import { SerializedPCD } from "@pcd/pcd-types";
import { EventEmitter } from "eventemitter3";
import { z, ZodFunction, ZodTuple, ZodTypeAny } from "zod";
import { RPCMessage, RPCMessageSchema, RPCMessageType } from "./protocol";
import {
  PODQuery,
  SubscriptionResult,
  ZupassEvents,
  ZupassGPC,
  ZupassIdentity,
  ZupassPOD,
  ZupassRPC
} from "./rpc_interfaces";
import { ZupassAPISchema } from "./schema";

type ZupassRPCMethodName =
  | `gpc.${keyof typeof ZupassAPISchema.shape.gpc.shape}`
  | `pod.${keyof typeof ZupassAPISchema.shape.pod.shape}`
  | `identity.${keyof typeof ZupassAPISchema.shape.identity.shape}`;

/**
 * The RPC client handles low-level communication with the Zupass iframe.
 * It is responsible for sending and receiving messages via MessagePorts,
 * as well as for parsing the responses.
 */
export class ZupassRPCClient implements ZupassRPC, ZupassEvents {
  public pod: ZupassPOD;
  public gpc: ZupassGPC;
  public identity: ZupassIdentity;
  public _version = "1" as const;

  // #-prefix indicates private fields, enforced at the JavaScript level so
  // that these values are not accessible outside of the class.
  #dialog: HTMLDialogElement;
  #port: MessagePort;
  #serial = 0;
  #pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  >();
  #emitter: EventEmitter;

  /**
   * Invoke a method on the remote Zupass.
   * The returned promise will be resolved when we get a response from Zupass,
   * with either a result or an error.
   *
   * @param fn - The method name.
   * @param args - The arguments to pass to the method.
   * @returns A promise that resolves to the method's return value.
   */
  #invoke(fn: string, args: unknown[]): Promise<unknown> {
    this.#serial++;
    const promise = new Promise((resolve, reject) => {
      this.#pending.set(this.#serial, { resolve, reject });
      this.#port.postMessage({
        type: RPCMessageType.ZUPASS_CLIENT_INVOKE,
        fn,
        args,
        serial: this.#serial
      });
    });
    return promise;
  }

  /**
   * Provides type-safe invocation, ensuring that we pass the correct types in
   * and that we parse the result to ensure that it is of the correct type.
   *
   * @param fn - The method name.
   * @param args - The arguments to pass to the method.
   * @returns A promise that resolves to the method's return value.
   */
  async #typedInvoke<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    A extends ZodTuple<any, any>,
    R extends ZodTypeAny,
    F extends ZodFunction<A, R>
  >(
    fn: ZupassRPCMethodName,
    args: z.infer<ReturnType<F["parameters"]>>,
    functionSchema: F
  ): Promise<z.infer<ReturnType<F["returnType"]>>> {
    const result = this.#invoke(fn, args);
    // Ensure that the result is of the expected type
    // Note that we are passing the promise here, and it will be awaited on
    // by safeParse.
    const parsedResult = functionSchema.returnType().safeParse(result);
    if (parsedResult.success) {
      return parsedResult.data;
    } else {
      throw new Error(
        `Failed to parse result for ${fn}: ${parsedResult.error}`
      );
    }
  }

  constructor(port: MessagePort, dialog: HTMLDialogElement) {
    this.#port = port;
    this.#dialog = dialog;
    this.#emitter = new EventEmitter();

    this.pod = {
      query: async (query: PODQuery): Promise<string[]> => {
        return this.#typedInvoke(
          "pod.query",
          [query],
          ZupassAPISchema.shape.pod.shape.query
        );
      },
      insert: async (serializedPod: string): Promise<void> => {
        return this.#typedInvoke(
          "pod.insert",
          [serializedPod],
          ZupassAPISchema.shape.pod.shape.insert
        );
      },
      delete: async (serializedPod: string): Promise<void> => {
        return this.#typedInvoke(
          "pod.delete",
          [serializedPod],
          ZupassAPISchema.shape.pod.shape.delete
        );
      },
      subscribe: async (query: PODQuery): Promise<string> => {
        return this.#typedInvoke(
          "pod.subscribe",
          [query],
          ZupassAPISchema.shape.pod.shape.subscribe
        );
      },
      unsubscribe: async (subscriptionId: string): Promise<void> => {
        return this.#typedInvoke(
          "pod.unsubscribe",
          [subscriptionId],
          ZupassAPISchema.shape.pod.shape.unsubscribe
        );
      }
    };
    this.gpc = {
      prove: async (args: GPCPCDArgs): Promise<SerializedPCD> => {
        return this.#typedInvoke(
          "gpc.prove",
          [args],
          ZupassAPISchema.shape.gpc.shape.prove
        );
      },
      verify: async (pcd: SerializedPCD): Promise<boolean> => {
        return this.#typedInvoke(
          "gpc.verify",
          [pcd],
          ZupassAPISchema.shape.gpc.shape.verify
        );
      }
    };
    this.identity = {
      getSemaphoreV3Commitment: async (): Promise<bigint> => {
        return this.#typedInvoke(
          "identity.getSemaphoreV3Commitment",
          [],
          ZupassAPISchema.shape.identity.shape.getSemaphoreV3Commitment
        );
      }
    };
  }

  /**
   * Start the RPC client.
   *
   * This starts an event loop which waits indefinitely for messages from
   * Zupass.
   *
   * @param onConnect - Callback to call when the Zupass client is ready.
   */
  public start(onConnect: () => void): void {
    const eventLoop = this.main(onConnect);
    eventLoop.next();

    // Set up a listener for messages from Zupass
    // Messages are sent to the event loop for processing
    this.#port.addEventListener("message", (ev: MessageEvent) => {
      const msg = RPCMessageSchema.safeParse(ev.data);
      if (msg.success) {
        eventLoop.next(msg.data);
      } else {
        console.error("Invalid message received: ", ev);
      }
    });
    this.#port.start();
  }

  /**
   * Main event loop for the Zupass client.
   *
   * This is a generator function, which means that it yields control to the
   * caller whenever it needs to wait for an event. Events are inserted into
   * the event loop by the message port listener set up in `start()`.
   *
   * @param onConnect - Callback to call when the Zupass client is ready.
   */
  private *main(onConnect: () => void): Generator<undefined, void, RPCMessage> {
    // Loop indefinitely until we get a ZUPASS_CLIENT_READY message
    // In the meantime, we will handle ZUPASS_CLIENT_SHOW and
    // ZUPASS_CLIENT_HIDE, as these may be necessary for Zupass to allow the
    // user to log in, which is a prerequisite for using the rest of the API
    // and for the ZUPASS_CLIENT_READY message to be sent.
    while (true) {
      const event = yield;
      console.log(`RECEIVED ${event.type}`);
      if (event.type === RPCMessageType.ZUPASS_CLIENT_READY) {
        onConnect();
        break;
      } else if (event.type === RPCMessageType.ZUPASS_CLIENT_SHOW) {
        this.#dialog.showModal();
      } else if (event.type === RPCMessageType.ZUPASS_CLIENT_HIDE) {
        this.#dialog.close();
      }
    }

    while (true) {
      const event = yield;
      console.log(`RECEIVED ${event.type}`);
      if (event.type === RPCMessageType.ZUPASS_CLIENT_INVOKE_RESULT) {
        this.#pending.get(event.serial)?.resolve(event.result);
      } else if (event.type === RPCMessageType.ZUPASS_CLIENT_INVOKE_ERROR) {
        this.#pending.get(event.serial)?.reject(new Error(event.error));
      } else if (event.type === RPCMessageType.ZUPASS_CLIENT_SHOW) {
        this.#dialog.showModal();
      } else if (event.type === RPCMessageType.ZUPASS_CLIENT_HIDE) {
        this.#dialog.close();
      } else if (
        event.type === RPCMessageType.ZUPASS_CLIENT_SUBSCRIPTION_UPDATE
      ) {
        this.#emitSubscriptionUpdate(event.update, event.subscriptionId);
      }
    }
  }

  on(
    event: "subscription-update",
    callback: (result: SubscriptionResult) => void
  ): void {
    this.#emitter.on("subscription-update", callback);
  }

  off(
    event: "subscription-update",
    callback: (result: SubscriptionResult) => void
  ): void {
    this.#emitter.off("subscription-update", callback);
  }

  removeAllListeners(): void {
    this.#emitter.removeAllListeners("subscription-update");
  }

  #emitSubscriptionUpdate(update: string[], subscriptionId: string): void {
    this.#emitter.emit("subscription-update", { update, subscriptionId });
  }
}
