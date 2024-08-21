import { z } from "zod";
import { ZappSchema } from "./zapp";

/**
 * Messages that can be sent directly to a window, before MessagePorts have\
 * been transferred.
 */
export enum WindowMessageType {
  ZUPASS_CLIENT_CONNECT = "zupass-client-connect",
  ZUPASS_HOST_CONNECT = "zupass-host-connect"
}

/**
 * Messages that can be sent via MessagePorts.
 */
export enum RPCMessageType {
  ZUPASS_CLIENT_INVOKE = "zupass-client-invoke",
  ZUPASS_CLIENT_INVOKE_RESULT = "zupass-client-invoke-result",
  ZUPASS_CLIENT_INVOKE_ERROR = "zupass-client-invoke-error",
  ZUPASS_CLIENT_READY = "zupass-client-ready",
  ZUPASS_CLIENT_SHOW = "zupass-client-show",
  ZUPASS_CLIENT_HIDE = "zupass-client-hide",
  ZUPASS_CLIENT_CONNECT = "zupass-client-connect"
}

/**
 * A schema for messages that can be sent via MessagePorts.
 */
export const RPCMessageSchema = z.discriminatedUnion("type", [
  /**
   * Invoke a remote procedure call.
   */
  z.object({
    type: z.literal(RPCMessageType.ZUPASS_CLIENT_INVOKE),
    serial: z.number(),
    fn: z.string(),
    args: z.array(z.unknown())
  }),
  /**
   * Return the result of a remote procedure call.
   */
  z.object({
    type: z.literal(RPCMessageType.ZUPASS_CLIENT_INVOKE_RESULT),
    result: z.unknown(),
    serial: z.number()
  }),
  /**
   * Return the error of a remote procedure call.
   */
  z.object({
    type: z.literal(RPCMessageType.ZUPASS_CLIENT_INVOKE_ERROR),
    error: z.string(),
    serial: z.number()
  }),
  /**
   * Indicate that the Zupass instance is ready to receive messages.
   */
  z.object({
    type: z.literal(RPCMessageType.ZUPASS_CLIENT_READY)
  }),
  /**
   * Tell a Zapp which has embedded Zupass to show the Zupass instance.
   */
  z.object({
    type: z.literal(RPCMessageType.ZUPASS_CLIENT_SHOW)
  }),
  /**
   * Hide the Zupass instance.
   */
  z.object({
    type: z.literal(RPCMessageType.ZUPASS_CLIENT_HIDE)
  }),
  /**
   * Tell Zupass that the Zapp wants to initiate connection.
   */
  z.object({
    type: z.literal(RPCMessageType.ZUPASS_CLIENT_CONNECT),
    zapp: ZappSchema
  })
]);

export const WindowMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(WindowMessageType.ZUPASS_CLIENT_CONNECT),
    zapp: ZappSchema
  }),
  z.object({
    type: z.literal(WindowMessageType.ZUPASS_HOST_CONNECT)
  })
]);

export type WindowMessage = z.infer<typeof WindowMessageSchema>;
export type RPCMessage = z.infer<typeof RPCMessageSchema>;

export function postWindowMessage(
  window: Window,
  message: WindowMessage,
  targetOrigin: string,
  transfer: Transferable[] = []
): void {
  window.postMessage(message, targetOrigin, transfer);
}

export function postRPCMessage(port: MessagePort, message: RPCMessage): void {
  port.postMessage(message);
}
