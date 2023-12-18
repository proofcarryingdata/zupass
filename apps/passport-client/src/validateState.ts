import { User, requestLogToServer } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { appConfig } from "./appConfig";
import { loadSelf } from "./localstorage";

/**
 * Validates the application state using {@link validateAppState}. In the case
 * that the state is invalid, returns `true`, and concurrently uploads the validation
 * errors to the server for further inspection.
 *
 * In the case there are no validation errors, returns `false`.
 */
export function validateAndLogStateErrors(
  validationTag: string,
  self: User | undefined,
  identity: Identity | undefined,
  pcds: PCDCollection | undefined,
  forceCheckPCDs?: boolean
): boolean {
  const validationErrors = validateAppState(
    validationTag,
    self,
    identity,
    pcds,
    forceCheckPCDs
  );

  if (validationErrors.errors.length > 0) {
    logValidationErrors(validationErrors);
    return false;
  }

  return true;
}

/**
 * Determines whether the app's global state contains valid data. If it does not,
 * returns the set of things that are incorrect about it in a {@link ValidationErrors}
 * object. If there were no validation errors the result will contain an empty array
 * of errors.
 *
 * The provided {@link PCDCollection} is not checked unless either this function
 * determines the user is logged in or the {@link forceCheckPCDs} argument is `true`.
 *
 * Depending on where this function is called, pass in a unique {@link validationTag}, so
 * that on the backend we can figure out where the validation failed.
 */
export function validateAppState(
  validationTag: string,
  self: User | undefined,
  identity: Identity | undefined,
  pcds: PCDCollection | undefined,
  forceCheckPCDs?: boolean
): ValidationErrors {
  const validationErrors: string[] = [];

  const loggedOut = !self;

  const identityPCDFromCollection = pcds?.getPCDsByType(
    SemaphoreIdentityPCDPackage.name
  )?.[0] as SemaphoreIdentityPCD | undefined;

  if (forceCheckPCDs || !loggedOut) {
    if (!pcds) {
      validationErrors.push("missing 'pcds'");
    }

    if (pcds?.size() === 0) {
      validationErrors.push("'pcds' contains no pcds");
    }

    if (!identityPCDFromCollection) {
      validationErrors.push(
        "'pcds' field in app state does not contain an identity PCD"
      );
    }
  }

  if (loggedOut) {
    return {
      errors: validationErrors,
      userUUID: undefined
    };
  }

  if (!self) {
    validationErrors.push("missing 'self'");
  }

  if (!identity) {
    validationErrors.push("missing 'identity'");
  }

  const identityFromPCDCollection = identityPCDFromCollection?.claim?.identity;
  const commitmentOfIdentityPCDInCollection =
    identityFromPCDCollection?.commitment?.toString();
  const commitmentFromSelfField = self?.commitment;
  const commitmentFromIdentityField = identity?.commitment?.toString();

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

  return {
    errors: validationErrors,
    userUUID: self?.uuid
  };
}

/**
 * Logs validation errors to the console, and uploads them to the server so that
 * we have records and are able to identify common types of errors. Does not leak
 * sensitive information, such as decrypted versions of e2ee storage.
 */
export async function logValidationErrors(
  errors: ValidationErrors
): Promise<void> {
  try {
    const user = loadSelf();
    errors.userUUID = errors.userUUID ?? user?.uuid;
    console.log(`encountered state validation errors: `, errors);
    await requestLogToServer(appConfig.zupassServer, "state-validation-error", {
      ...errors
    });
  } catch (e) {
    console.log("error reporting errors", e);
  }
}

/**
 * Uploaded to server in case of a state validation error.
 */
export interface ValidationErrors {
  /**
   * Human readable non-sensitive-information-leaking errors. If this array is empty,
   * it represents a state that has no errors.
   */
  errors: string[];

  /**
   * Used to identify the user on the server-side.
   */
  userUUID?: string;
}
