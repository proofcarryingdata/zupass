import {
  ISSUANCE_STRING,
  PendingPCD,
  ProveOptions,
  requestProveOnServer
} from "@pcd/passport-interface";
import {
  ArgsOf,
  PCDOf,
  PCDPackage,
  SerializedPCD,
  isPCDArgument
} from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCDPackage,
  SemaphoreSignaturePCDTypeName
} from "@pcd/semaphore-signature-pcd";
import { getErrorMessage } from "@pcd/util";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import { usePCDCollection } from "../../../src/appHooks";
import { getOutdatedBrowserErrorMessage } from "../../../src/devconnectUtils";
import { OUTDATED_BROWSER_ERROR_MESSAGE } from "../../../src/sharedConstants";
import { useAppRollbar } from "../../../src/useAppRollbar";
import { nextFrame } from "../../../src/util";
import { Button } from "../../core";
import { RippleLoader } from "../../core/RippleLoader";
import { ErrorContainer } from "../../core/error";
import { PCDArgs } from "../../shared/PCDArgs";

/**
 * A reuseable form which can be used to generate a new instance of a PCD
 * given the type, arguments, and proving options.
 */
export function GenericProveSection<T extends PCDPackage = PCDPackage>({
  pcdType,
  initialArgs,
  options,
  onProve,
  folder
}: {
  pcdType: string;
  initialArgs: ArgsOf<T>;
  options?: ProveOptions;
  onProve: (
    pcd: PCDOf<T> | undefined,
    serializedPCD: SerializedPCD<PCDOf<T>> | undefined,
    pendingPCD: PendingPCD | undefined
  ) => void;
  folder?: string;
}): JSX.Element {
  const rollbar = useAppRollbar();
  const pcds = usePCDCollection();
  const [args, setArgs] = useState<ArgsOf<T>>(
    JSON.parse(JSON.stringify(initialArgs))
  );
  const [error, setError] = useState<string | undefined>();
  const [proving, setProving] = useState(false);
  const pcdPackage = pcds.getPackage<T>(pcdType);

  useEffect(() => {
    setError(undefined);
  }, [args]);

  const isProveReady = useMemo(
    () =>
      !Object.entries(args).find(
        ([_, arg]) =>
          // only PCD arguments are required
          isPCDArgument(arg) && !arg.value
      ),
    [args]
  );

  const onProveClick = useCallback(async () => {
    setProving(true);
    setError(undefined);

    // Give the UI has a chance to update to the 'loading' state before the
    // potentially blocking proving operation kicks off
    await nextFrame();

    if (pcdType === SemaphoreSignaturePCDTypeName) {
      const signatureArgs = args as ArgsOf<typeof SemaphoreSignaturePCDPackage>;
      if (signatureArgs?.signedMessage?.value === ISSUANCE_STRING) {
        setError("Can't sign this message");
        setProving(false);
        return;
      }
    }

    if (options?.proveOnServer === true) {
      const pendingPCDResult = await requestProveOnServer(
        appConfig.zupassServer,
        {
          pcdType: pcdType,
          args: args
        }
      );
      setProving(false);

      if (!pendingPCDResult.success) {
        rollbar?.error(pendingPCDResult.error);
        if (pendingPCDResult.error.includes(OUTDATED_BROWSER_ERROR_MESSAGE)) {
          setError(getOutdatedBrowserErrorMessage());
        } else {
          setError(pendingPCDResult.error);
        }
        return;
      }

      onProve(undefined, undefined, pendingPCDResult.value);
    } else {
      try {
        if (!pcdPackage) {
          throw new Error(`PCD package not found for ${pcdType}`);
        }
        const pcd = await pcdPackage.prove(args);
        const serializedPCD = await pcdPackage.serialize(pcd);
        onProve(pcd as PCDOf<T>, serializedPCD, undefined);
      } catch (e) {
        const errorMessage = getErrorMessage(e);
        if (errorMessage.includes(OUTDATED_BROWSER_ERROR_MESSAGE)) {
          setError(getOutdatedBrowserErrorMessage());
        } else {
          setError(errorMessage);
        }
        // NB: Only re-enable the 'Prove' button if there was an error. If
        // the proving operation succeeded, we want to leave the button
        // disabled while onProve redirects user.
        setProving(false);
      }
    }
  }, [options?.proveOnServer, pcdType, args, onProve, pcdPackage, rollbar]);

  return (
    <Container>
      {options?.description && <Description>{options.description}</Description>}

      {options?.debug && <pre>{JSON.stringify(args, null, 2)}</pre>}

      <PCDArgs
        args={args}
        setArgs={setArgs}
        options={pcdPackage?.getProveDisplayOptions?.()?.defaultArgs}
      />

      {folder && (
        <div>
          PCD will be added to folder: <br />
          <strong>{folder}</strong>
        </div>
      )}

      {error && <ErrorContainer>{error}</ErrorContainer>}

      {proving ? (
        <RippleLoader />
      ) : (
        <Button disabled={!isProveReady} onClick={onProveClick}>
          Prove
        </Button>
      )}
    </Container>
  );
}

const Description = styled.div`
  font-size: 14px;
  color: rgba(var(--white-rgb), 0.8);
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 16px 8px;
  gap: 16px;
  width: 100%;
`;
