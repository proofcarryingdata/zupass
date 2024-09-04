import { User, requestLogToServer } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import {
  IdentityV4,
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage,
  v4PublicKey
} from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { appConfig } from "./appConfig";
import { loadSelf } from "./localstorage";
import { AppState } from "./state";
import { findIdentityV3PCD, findUserIdentityV3PCD } from "./user";

/**
 * Returns `true` if {@link validateInitialAppState} returns no errors, and `false`
 * otherwise. In the case that errors were encountered, uploads an error report to
 * the Zupass backend.
 */
export function validateAndLogInitialAppState(
  tag: string,
  state: AppState
): boolean {
  const validationErrors = validateInitialAppState(tag, state);

  if (validationErrors.errors.length > 0) {
    logValidationErrors(validationErrors);
    return false;
  }

  return true;
}

/**
 * Returns `true` if {@link validateRunningAppState} returns no errors, and `false`
 * otherwise. In the case that errors were encountered, uploads an error report to
 * the Zupass backend.
 */
export function validateAndLogRunningAppState(
  tag: string,
  self: User | undefined,
  identity: Identity | undefined,
  identityV4: IdentityV4 | undefined,
  pcds: PCDCollection | undefined,
  forceCheckPCDs?: boolean
): boolean {
  const validationErrors = validateRunningAppState(
    tag,
    self,
    identity,
    identityV4,
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
 * Validates state of a Zupass application that is just starting up (using the
 * {@link validateRunningAppState} alongside some extra ones), and returns an {@link ErrorReport}.
 */
export function validateInitialAppState(
  tag: string,
  appState: AppState | undefined
): ErrorReport {
  return {
    errors: getInitialAppStateValidationErrors(appState),
    userUUID: appState?.self?.uuid,
    tag
  };
}

/**
 * Validates state of a running Zupass application and returns an {@link ErrorReport}.
 */
export function validateRunningAppState(
  tag: string,
  self: User | undefined,
  identity: Identity | undefined,
  identityV4: IdentityV4 | undefined,
  pcds: PCDCollection | undefined,
  forceCheckPCDs?: boolean
): ErrorReport {
  return {
    errors: getRunningAppStateValidationErrors(
      self,
      identity,
      identityV4,
      pcds,
      forceCheckPCDs
    ),
    userUUID: self?.uuid,
    tag
  };
}

/**
 * Validates state of a Zupass application that is just starting up. Uses
 * {@link getRunningAppStateValidationErrors}, and performs some extra checks
 * on top of it.
 */
export function getInitialAppStateValidationErrors(
  state: AppState | undefined
): string[] {
  const errors = [
    ...getRunningAppStateValidationErrors(
      state?.self,
      state?.identityV3,
      state?.identityV4,
      state?.pcds
    )
  ];

  // this case covers a logged in user. the only way the app can get a 'self'
  // is by requesting one from the server, to do which one has to be logged in.
  if (state?.self) {
    // TODO: any extra checks that need to happen on immediate app startup should
    // be put here.
  }

  return errors;
}

/**
 * Validates state of a running Zupass application. Returns a list of errors
 * represented by strings. If the state is not invalid, returns an empty list.
 */
export function getRunningAppStateValidationErrors(
  self: User | undefined,
  identity: Identity | undefined,
  identityV4: IdentityV4 | undefined,
  pcds: PCDCollection | undefined,
  forceCheckPCDs?: boolean
): string[] {
  const errors: string[] = [];
  const loggedOut = !self;

  // Find identity PCD in the standard way, using a known commitment.
  let idFromPCDCollection: SemaphoreIdentityPCD | undefined = undefined;

  if (self && pcds) {
    idFromPCDCollection = findUserIdentityV3PCD(pcds, self);
  } else if (identity && identityV4 && pcds) {
    idFromPCDCollection = findIdentityV3PCD(
      pcds,
      identity.commitment.toString()
    );
  }

  // If identity PCD doesn't match, or we don't have a known commitment,
  // grab any available identity PCD so we can report whether it's missing vs.
  // mismatch.
  if (pcds) {
    if (!idFromPCDCollection) {
      idFromPCDCollection = pcds.getPCDsByType(
        SemaphoreIdentityPCDPackage.name
      )?.[0] as SemaphoreIdentityPCD | undefined;
    }
  }

  if (forceCheckPCDs || !loggedOut) {
    if (!pcds) {
      errors.push("missing 'pcds'");
    }

    if (pcds?.size() === 0) {
      errors.push("'pcds' contains no pcds");
    }

    if (!idFromPCDCollection) {
      errors.push(
        "'pcds' field in app state does not contain an identity v3 PCD"
      );
    }
  }

  if (loggedOut) {
    return errors;
  }

  if (!identity) {
    errors.push("missing 'identity'");
  }

  if (!identityV4) {
    errors.push("missing 'identityV4'");
  }

  const identityFromPCDCollection = idFromPCDCollection?.claim?.identity;
  const commitmentOfIdentityPCDInCollection =
    identityFromPCDCollection?.commitment?.toString();
  const commitmentFromSelfField = self?.commitment;
  const commitmentFromIdentityField = identity?.commitment?.toString();

  const commitmentOfIdentityV4PCDInCollection =
    idFromPCDCollection?.claim.identityV4?.commitment?.toString();
  const commitmentV4FromSelfField = self?.semaphore_v4_commitment;
  const commitmentV4FromIdentityField = identityV4?.commitment?.toString();
  const publicKeyV4FromSelfField = self?.semaphore_v4_pubkey;
  const publicKeyV4FromIdentityField = identityV4 && v4PublicKey(identityV4);

  if (commitmentFromSelfField === undefined) {
    errors.push(`'self' missing a v3 commitment`);
  }

  if (commitmentV4FromSelfField === undefined) {
    errors.push(`'self' missing a v4 commitment`);
  }

  if (
    commitmentFromSelfField === undefined ||
    commitmentOfIdentityPCDInCollection === undefined ||
    commitmentFromIdentityField === undefined
  ) {
    // these cases are validated earlier in this function
  } else {
    // in 'else' block we check that the commitments from all three
    // places that the user's commitment exists match - in the self, the
    // identity, and in the pcd collection

    if (publicKeyV4FromSelfField !== publicKeyV4FromIdentityField) {
      errors.push(
        `public key in 'self' field of app state (${publicKeyV4FromSelfField})` +
          ` does not match public key of 'identityV4' field of app state (${publicKeyV4FromIdentityField})`
      );
    }

    if (commitmentV4FromSelfField !== commitmentV4FromIdentityField) {
      errors.push(
        `v4 commitment in 'self' field of app state (${commitmentV4FromSelfField})` +
          ` does not match v4 commitment of 'identityV4' field of app state (${commitmentV4FromIdentityField})`
      );
    }

    if (commitmentOfIdentityPCDInCollection !== commitmentFromSelfField) {
      errors.push(
        `commitment of identity pcd in collection (${commitmentOfIdentityPCDInCollection})` +
          ` does not match commitment in 'self' field of app state (${commitmentFromSelfField})`
      );
    }
    if (commitmentFromSelfField !== commitmentFromIdentityField) {
      errors.push(
        `commitment in 'self' field of app state (${commitmentFromSelfField})` +
          ` does not match commitment of 'identity' field of app state (${commitmentFromIdentityField})`
      );
    }

    if (commitmentFromIdentityField !== commitmentOfIdentityPCDInCollection) {
      errors.push(
        `commitment of 'identity' field of app state (${commitmentFromIdentityField})` +
          ` does not match commitment of identity pcd in collection (${commitmentOfIdentityPCDInCollection})`
      );
    }
  }

  if (
    commitmentV4FromSelfField === undefined ||
    commitmentOfIdentityV4PCDInCollection === undefined ||
    commitmentV4FromIdentityField === undefined
  ) {
    // these cases are validated earlier in this function
  } else {
    // in 'else' block we check that the commitments from all three
    // places that the user's commitment exists match - in the self, the
    // identity, and in the pcd collection

    if (commitmentOfIdentityV4PCDInCollection !== commitmentV4FromSelfField) {
      errors.push(
        `commitment of identity v4 pcd in collection (${commitmentOfIdentityV4PCDInCollection})` +
          ` does not match commitment in 'self' field of app state (${commitmentV4FromSelfField})`
      );
    }
    if (commitmentV4FromSelfField !== commitmentV4FromIdentityField) {
      errors.push(
        `v4 commitment in 'self' field of app state (${commitmentV4FromSelfField})` +
          ` does not match commitment of 'identityV4' field of app state (${commitmentV4FromIdentityField})`
      );
    }

    if (
      commitmentV4FromIdentityField !== commitmentOfIdentityV4PCDInCollection
    ) {
      errors.push(
        `commitment of 'identityV4' field of app state (${commitmentV4FromIdentityField})` +
          ` does not match commitment of identity v4 pcd in collection (${commitmentOfIdentityV4PCDInCollection})`
      );
    }
  }

  return errors;
}

/**
 * Logs validation errors to the console, and uploads them to the server so that
 * we have records and are able to identify common types of errors. Does not leak
 * sensitive information, such as decrypted versions of e2ee storage.
 */
export async function logValidationErrors(
  errorReport: ErrorReport
): Promise<void> {
  if (errorReport?.errors?.length === 0) {
    console.log(`not logging empty error report`);
    return;
  }

  try {
    const user = loadSelf();
    errorReport.userUUID = errorReport.userUUID ?? user?.uuid;
    console.log(`encountered state validation errors: `, errorReport);
    await requestLogToServer(appConfig.zupassServer, "state-validation-error", {
      ...errorReport
    });
  } catch (e) {
    console.log("error reporting errors", e);
  }
}

/**
 * Uploaded to server in case of a state validation error.
 */
export interface ErrorReport {
  /**
   * Human readable non-sensitive-information-leaking errors. If this array is empty,
   * it represents a state that has no errors.
   */
  errors: string[];

  /**
   * Used to identify the user on the server-side.
   */
  userUUID?: string;

  /**
   * Uniquely identifies the location in the code from which this error report
   * was initiated.
   */
  tag: string;
}
