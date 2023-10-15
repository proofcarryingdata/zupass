import {
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
import { getErrorMessage } from "@pcd/util";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import { usePCDCollection } from "../../../src/appHooks";
import { useAppRollbar } from "../../../src/useAppRollbar";
import { nextFrame } from "../../../src/util";
import { Button } from "../../core";
import { RippleLoader } from "../../core/RippleLoader";
import { PCDArgs } from "../../shared/PCDArgs";

/**
 * A reuseable form which can be used to generate a new instance of a PCD
 * given the type, arguments, and proving options.
 */
export function GenericProveSection<T extends PCDPackage = PCDPackage>({
  pcdType,
  initialArgs,
  options,
  onProve
}: {
  pcdType: string;
  initialArgs: ArgsOf<T>;
  options?: ProveOptions;
  onProve: (
    pcd: PCDOf<T> | undefined,
    serializedPCD: SerializedPCD<PCDOf<T>> | undefined,
    pendingPCD: PendingPCD | undefined
  ) => void;
}) {
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
        setError(pendingPCDResult.error);
        return;
      }

      onProve(undefined, undefined, pendingPCDResult.value);
    } else {
      try {
        const pcd = await pcdPackage.prove(args);
        const serializedPCD = await pcdPackage.serialize(pcd);
        onProve(pcd as any, serializedPCD, undefined);
      } catch (e) {
        setError(getErrorMessage(e));
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
        options={pcdPackage.getProveDisplayOptions?.(args)?.defaultArgs}
      />

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

const ErrorContainer = styled.div`
  width: 100%;
  padding: 16px;
  background-color: white;
  color: var(--danger);
  border-radius: 16px;
  border: 1px solid var(--danger);
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 16px 8px;
  gap: 16px;
  width: 100%;
`;
