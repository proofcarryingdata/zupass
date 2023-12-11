import { requestLogToServer } from "@pcd/passport-interface";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import { appConfig } from "./appConfig";
import { AppState } from "./state";

/**
 * Determines whether the appState object contains valid data. If it does not,
 * returns the set of things that are incorrect about it in an array of human
 * interpretable strings.
 */
export function validateState(appState: AppState): string[] {
  const validationErrors: string[] = [];

  if (!appState.self) {
    validationErrors.push("missing 'self' field from app state");
  }

  if (!appState.identity) {
    validationErrors.push("missing 'identity' field from app state");
  }

  if (!appState.encryptionKey) {
    validationErrors.push("missing 'encryption' field from app state key");
  }

  if (!appState.pcds) {
    validationErrors.push("missing 'pcds' field from app state");
  }

  if (appState.pcds.size() === 0) {
    validationErrors.push("'pcds' field in app state contains no pcds");
  }

  const identityPCDFromCollection = appState.pcds.getPCDsByType(
    SemaphoreIdentityPCDPackage.name
  )[0] as SemaphoreIdentityPCD | undefined;

  if (!identityPCDFromCollection) {
    validationErrors.push(
      "'pcds' field in app state does not contain an identity PCD"
    );
  }

  const identityFromPCDCollection = identityPCDFromCollection?.claim?.identity;
  const commitmentOfIdentityPCDInCollection =
    identityFromPCDCollection?.commitment?.toString();
  const commitmentFromSelfField = appState?.self?.commitment;
  const commitmentFromIdentityField =
    appState?.identity?.commitment?.toString();

  if (commitmentOfIdentityPCDInCollection !== commitmentFromSelfField) {
    validationErrors.push(
      `commitment of identity pcd in collection (${commitmentOfIdentityPCDInCollection})` +
        ` does not match commitment in 'self' field of app state (${commitmentFromSelfField})`
    );
  }

  if (commitmentFromSelfField !== commitmentFromIdentityField) {
    validationErrors.push(
      `commitment in 'self' field of app state (${commitmentFromSelfField})` +
        ` does not match commitment of 'identity' field of app state (${commitmentFromIdentityField})`
    );
  }

  if (commitmentFromIdentityField !== commitmentOfIdentityPCDInCollection) {
    validationErrors.push(
      `commitment of 'identity' field of app state (${commitmentFromIdentityField})` +
        ` does not match commitment of identity pcd in collection (${commitmentOfIdentityPCDInCollection})`
    );
  }

  return validationErrors;
}

export async function logAndUploadValidationErrors(
  errors: string[]
): Promise<void> {
  try {
    console.log(`encountered state validation errors: `, errors);
    await requestLogToServer(appConfig.zupassServer, "state-validation-error", {
      errors
    });
  } catch (e) {
    console.log("error reporting errors", e);
  }
}
