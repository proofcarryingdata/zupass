import { User, requestLogToServer } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
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

export function validatePCDCollection(pcds?: PCDCollection): string[] {
  const validationErrors: string[] = [];

  if (!pcds) {
    validationErrors.push("pcd collection is absent");
  }

  if (pcds.size() === 0) {
    validationErrors.push("pcd collection is empty");
  }

  const identityPCDFromCollection = pcds.getPCDsByType(
    SemaphoreIdentityPCDPackage.name
  )[0] as SemaphoreIdentityPCD | undefined;

  if (!identityPCDFromCollection) {
    validationErrors.push("pcd collection does not contain an identity pcd");
  }

  return validationErrors;
}

export function validateUpload(user?: User, pcds?: PCDCollection): string[] {
  const validationErrors: string[] = [];

  if (!user) {
    validationErrors.push(`upload must include a user`);
  }

  if (!pcds) {
    validationErrors.push(`upload must include a pcd collection`);
  }

  const identityPCDFromCollection = pcds.getPCDsByType(
    SemaphoreIdentityPCDPackage.name
  )[0] as SemaphoreIdentityPCD | undefined;
  const commitmentFromPCDCollection =
    identityPCDFromCollection?.claim?.identity?.commitment?.toString();

  if (user?.commitment !== commitmentFromPCDCollection) {
    validationErrors.push(
      "user commitment does not equal to commitment of identity pcd in pcd collection"
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
