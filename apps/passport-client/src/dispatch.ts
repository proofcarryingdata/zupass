import { Identity } from "@semaphore-protocol/identity";
import { createContext } from "react";
import { saveSelf, ZuParticipant } from "./participant";
import { ZuState } from "./state";

export type Dispatcher = (action: Action) => void;

export type Action =
  | {
      type: "new-passport";
      body: {
        email: string;
      };
    }
  | {
      type: "save-self";
      participant: ZuParticipant;
    }
  | {
      type: "clear-error";
    };

export const DispatchContext = createContext<[ZuState, Dispatcher]>([] as any);

export type ZuUpdate = (s: Partial<ZuState>) => void;

export async function dispatch(
  action: Action,
  state: ZuState,
  update: ZuUpdate
) {
  console.log(`Dispatching ${action.type}`, action);

  switch (action.type) {
    case "new-passport":
      return genPassport(state, update);
    case "save-self":
      return doSaveSelf(action.participant, state, update);
    case "clear-error":
      return clearError(update);
    default:
      console.error("Unknown action type", action);
  }
}

async function genPassport(_: ZuState, update: ZuUpdate) {
  // Generate a semaphore identity, save it to the local store, generate an
  // email magic link. In prod, send email, in dev, display the link.
  window.location.hash = "#/new-passport";

  // Generate a fresh identity, save in local storage.
  const identity = new Identity();
  console.log("Created identity", identity.toString());
  update({ identity });
}

function doSaveSelf(
  participant: ZuParticipant,
  state: ZuState,
  update: ZuUpdate
) {
  // Verify that the identity is correct.
  const { identity } = state;
  if (
    identity == null ||
    identity.commitment.toString() !== participant.commitment
  ) {
    update({
      error: {
        title: "Invalid identity",
        message: "Something went wrong saving your passport. Contact support.",
      },
    });
  }

  // Save to local storage.
  saveSelf(participant);
  update({ self: participant });
}

function clearError(update: ZuUpdate) {
  window.location.hash = "#/";
  update({ error: undefined });
}
