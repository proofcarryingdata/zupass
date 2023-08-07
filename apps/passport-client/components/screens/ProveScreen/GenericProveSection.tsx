import {
  PendingPCD,
  ProveOptions,
  ProveRequest
} from "@pcd/passport-interface";
import { ArgsOf, PCDOf, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { useCallback, useState } from "react";
import styled from "styled-components";
import { requestPendingPCD } from "../../../src/api/requestPendingPCD";
import { usePCDCollection } from "../../../src/appHooks";
import { useAppRollbar } from "../../../src/useAppRollbar";
import { nextFrame } from "../../../src/util";
import { Button, H1, Spacer } from "../../core";
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
  const [args, setArgs] = useState(JSON.parse(JSON.stringify(initialArgs)));
  const [error, setError] = useState<Error | undefined>();
  const [proving, setProving] = useState(false);
  const pcdPackage = pcds.getPackage<T>(pcdType);

  const onProveClick = useCallback(async () => {
    try {
      setProving(true);

      // Give the UI has a chance to update to the 'loading' state before the
      // potentially blocking proving operation kicks off
      await nextFrame();

      if (options?.proveOnServer === true) {
        const serverReq: ProveRequest = {
          pcdType: pcdType,
          args: args
        };
        const pendingPCD = await requestPendingPCD(serverReq);
        onProve(undefined, undefined, pendingPCD);
      } else {
        const pcd = await pcdPackage.prove(args);
        const serialized = await pcdPackage.serialize(pcd);
        onProve(pcd as any, serialized, undefined);
      }
    } catch (e) {
      console.log(e);
      rollbar?.error(e);
      setError(e);
      setProving(false);
    }
  }, [options?.proveOnServer, pcdType, args, onProve, pcdPackage, rollbar]);

  const pageTitle = options?.title ?? "Prove " + pcdType;

  return (
    <>
      <H1>🔑 &nbsp; {pageTitle}</H1>
      {options?.description && (
        <>
          <Spacer h={16} />
          <p>{options.description}</p>
        </>
      )}

      <Spacer h={24} />
      {options?.debug && <pre>{JSON.stringify(args, null, 2)}</pre>}
      <PCDArgs args={args} setArgs={setArgs} pcdCollection={pcds} />
      <Spacer h={16} />
      {error && (
        <>
          <ErrorContainer>{error.message}</ErrorContainer>
          <Spacer h={16} />
        </>
      )}
      {proving ? (
        <RippleLoader />
      ) : (
        <Button onClick={onProveClick}>Prove</Button>
      )}
    </>
  );
}

const ErrorContainer = styled.div`
  padding: 16px;
  background-color: white;
  color: var(--danger);
  border-radius: 16px;
  border: 1px solid var(--danger);
`;
