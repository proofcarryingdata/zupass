import { User, requestLogToServer } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import {
  IdentityV3,
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage,
  v4PublicKey
} from "@pcd/semaphore-identity-pcd";
import { appConfig } from "./appConfig";
import { loadSelf } from "./localstorage";
import { AppState } from "./state";
import { findIdentityPCD, findUserIdentityPCD } from "./user";

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
  identity: IdentityV3 | undefined,
  pcds: PCDCollection | undefined,
  forceCheckPCDs?: boolean
): boolean {
  const validationErrors = validateRunningAppState(
    tag,
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
  identity: IdentityV3 | undefined,
  pcds: PCDCollection | undefined,
  forceCheckPCDs?: boolean
): ErrorReport {
  return {
    errors: getRunningAppStateValidationErrors(
      self,
      identity,
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
  identityV3FromState: IdentityV3 | undefined,
  pcds: PCDCollection | undefined,
  forceCheckPCDs?: boolean
): string[] {
  const errors: string[] = [];
  const loggedOut = !self;

  // Find identity PCD in the standard way, using a known commitment.
  let identityPCDFromCollection: SemaphoreIdentityPCD | undefined = undefined;
  if (self && pcds) {
    identityPCDFromCollection = findUserIdentityPCD(pcds, self);
  } else if (identityV3FromState && pcds) {
    identityPCDFromCollection = findIdentityPCD(
      pcds,
      identityV3FromState.commitment.toString()
    );
  }

  // If identity PCD doesn't match, or we don't have a known commitment,
  // grab any available identity PCD so we can report whether it's missing vs.
  // mismatch.
  if (pcds && !identityPCDFromCollection) {
    identityPCDFromCollection = pcds.getPCDsByType(
      SemaphoreIdentityPCDPackage.name
    )?.[0] as SemaphoreIdentityPCD | undefined;
  }

  if (forceCheckPCDs || !loggedOut) {
    if (!pcds) {
      errors.push("missing 'pcds'");
    }

    if (pcds?.size() === 0) {
      errors.push("'pcds' contains no pcds");
    }

    if (!identityPCDFromCollection) {
      errors.push("'pcds' field in app state does not contain an identity PCD");
    }
  }

  if (loggedOut) {
    return errors;
  }

  if (!identityV3FromState) {
    errors.push("missing v3 identity from state");
  }

  const identityV3FromPCDCollection =
    identityPCDFromCollection?.claim?.identityV3;
  const v3CommitmentOfIdentityPCDInCollection =
    identityV3FromPCDCollection?.commitment?.toString();
  const v3CommitmentFromSelfField = self?.commitment;
  const v3CommitmentFromIdentityField =
    identityV3FromState?.commitment?.toString();

  if (v3CommitmentFromSelfField === undefined) {
    errors.push(`'self' missing a v3 commitment`);
  }

  if (
    !v3CommitmentFromSelfField ||
    !v3CommitmentOfIdentityPCDInCollection ||
    !v3CommitmentFromIdentityField
  ) {
    // these cases are validated earlier in this function
  } else {
    // in 'else' block we check that the commitments from all three
    // places that the user's commitment exists match - in the self, the
    // identity, and in the pcd collection

    if (v3CommitmentOfIdentityPCDInCollection !== v3CommitmentFromSelfField) {
      errors.push(
        `commitment of identity pcd in collection (${v3CommitmentOfIdentityPCDInCollection})` +
          ` does not match commitment in 'self' field of app state (${v3CommitmentFromSelfField})`
      );
    }
    if (v3CommitmentFromSelfField !== v3CommitmentFromIdentityField) {
      errors.push(
        `commitment in 'self' field of app state (${v3CommitmentFromSelfField})` +
          ` does not match commitment of 'identity' field of app state (${v3CommitmentFromIdentityField})`
      );
    }

    if (
      v3CommitmentFromIdentityField !== v3CommitmentOfIdentityPCDInCollection
    ) {
      errors.push(
        `commitment of 'identity' field of app state (${v3CommitmentFromIdentityField})` +
          ` does not match commitment of identity pcd in collection (${v3CommitmentOfIdentityPCDInCollection})`
      );
    }
  }

  const v4CommitmentFromPCDCollection =
    identityPCDFromCollection?.claim?.identityV4?.commitment?.toString();
  const v4CommitmentFromSelfField = self?.semaphore_v4_commitment;

  const v4PublicKeyFromSelfField = self?.semaphore_v4_pubkey;
  const v4PublicKeyFromPCDCollection =
    identityPCDFromCollection &&
    v4PublicKey(identityPCDFromCollection.claim.identityV4);

  // either we are missing v4 commitment from `self`
  if (!v4CommitmentFromSelfField && !!v4PublicKeyFromSelfField) {
    errors.push(
      "missing 'semaphore_v4_commitment' from 'self'. either both 'semaphore_v4_commitment' and 'semaphore_v4_pubkey' must be present, or neither must be present."
    );
  }
  // or we are missing v4 public key from `self`
  else if (!!v4CommitmentFromSelfField && !v4PublicKeyFromSelfField) {
    errors.push(
      "missing 'semaphore_v4_pubkey' from 'self'. either both 'semaphore_v4_commitment' and 'semaphore_v4_pubkey' must be present, or neither must be present."
    );
  }
  // or both v4 public key and v4 commitment are present in `self`
  else if (v4CommitmentFromSelfField && v4PublicKeyFromSelfField) {
    if (v4CommitmentFromSelfField !== v4CommitmentFromPCDCollection) {
      errors.push(
        `v4 commitment in self (${v4CommitmentFromSelfField})` +
          ` does not match v4 commitment of identity in pcd collection (${v4CommitmentFromPCDCollection})`
      );
    }

    if (v4PublicKeyFromSelfField !== v4PublicKeyFromPCDCollection) {
      errors.push(
        `v4 public key in self (${v4PublicKeyFromSelfField})` +
          ` does not match v4 public key of identity in pcd collection (${v4PublicKeyFromPCDCollection})`
      );
    }
  } else {
    // or we are missing both, which is fine, because this is the state that all users
    // who logged in prior to the v4 migration will be in.
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
    const user = await loadSelf();
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
