import { StytchUIClient } from "@stytch/vanilla-js";
import validator from "email-validator";
import { useMemo, useState } from "react";
import { SESSION_DURATION_MINUTES } from "../constants";
import { GIContextState } from "../helpers/Context";
import { DEV_JWT_KEY } from "../helpers/userHooks";

const STATE_KEY = "settings-8";

export function useInitialState(
  stytch: StytchUIClient | undefined
): GIContextState {
  const [devModeAuthToken, setDevModeAuthToken] = useState<string | undefined>(
    !stytch ? window.localStorage.getItem(DEV_JWT_KEY) ?? undefined : undefined
  );

  const savedState = useMemo(() => {
    return loadState();
  }, []);

  const initialState: GIContextState = {
    ...savedState,
    devModeAuthToken,
    setState: () => {
      //
    },
    logout: async () => {
      if (stytch) {
        await stytch.session.revoke();
        window.location.reload();
      } else {
        window.localStorage.removeItem(DEV_JWT_KEY);
        setDevModeAuthToken(undefined);
        window.location.reload();
      }
    },
    handleAuthToken: async (token?: string): Promise<void> => {
      if (!token || token === devModeAuthToken) {
        return;
      }

      if (!stytch) {
        if (validator.validate(token)) {
          window.localStorage.setItem(DEV_JWT_KEY, token);
          setDevModeAuthToken(token);
          window.location.reload();
        } else {
          alert("please use a valid email address");
          window.location.href = "/#/";
          return;
        }
      } else {
        await stytch.magicLinks.authenticate(token, {
          session_duration_minutes: SESSION_DURATION_MINUTES
        });
      }
    }
  };

  return initialState;
}

export function saveState(state: GIContextState): void {
  window.localStorage.setItem(
    STATE_KEY,
    JSON.stringify(toLocalStorageState(state))
  );
}

function loadState(): LocalStorageState {
  try {
    const saved = window.localStorage.getItem(STATE_KEY);
    if (!saved) {
      throw new Error("no saved state");
    }
    const parsed = JSON.parse(saved) as LocalStorageState;
    return parsed;
  } catch {
    return defaultSavedState();
  }
}

function defaultSavedState(): LocalStorageState {
  return {
    isAdminMode: false,
    pipelineDetailsAccordionState: [0]
  };
}

function toLocalStorageState(state: GIContextState): LocalStorageState {
  return {
    isAdminMode: state.isAdminMode,
    pipelineDetailsAccordionState: state.pipelineDetailsAccordionState
  };
}
export type LocalStorageState = Pick<
  GIContextState,
  "pipelineDetailsAccordionState" | "isAdminMode"
>;
