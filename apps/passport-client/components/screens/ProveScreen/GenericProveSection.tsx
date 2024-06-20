import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  EdDSATicketPCDTypeName
} from "@pcd/eddsa-ticket-pcd";
import {
  ISSUANCE_STRING,
  PendingPCD,
  ProveOptions,
  requestProveOnServer
} from "@pcd/passport-interface";
import { ErrorContainer } from "@pcd/passport-ui";
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
import {
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDPackage,
  isZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import _ from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import { usePCDCollection } from "../../../src/appHooks";
import { getOutdatedBrowserErrorMessage } from "../../../src/devconnectUtils";
import { OUTDATED_BROWSER_ERROR_MESSAGE } from "../../../src/sharedConstants";
import { nextFrame } from "../../../src/util";
import { Button } from "../../core";
import { ProgressBar } from "../../core/ProgressBar";
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
  onProve,
  folder
}: {
  pcdType: string;
  initialArgs: ArgsOf<T>;
  options?: ProveOptions;
  onProve: (
    pcd: PCDOf<T> | undefined,
    serializedPCD: SerializedPCD<PCDOf<T>> | undefined,
    pendingPCD: PendingPCD | undefined,
    multiplePCDs?: Array<SerializedPCD<PCDOf<T>>>
  ) => void;
  folder?: string;
}): JSX.Element {
  const pcds = usePCDCollection();
  const [args, setArgs] = useState<ArgsOf<T>>(
    JSON.parse(JSON.stringify(initialArgs))
  );
  const [error, setError] = useState<string | undefined>();
  const [proving, setProving] = useState(false);
  const pcdPackage = pcds.getPackage<T>(pcdType);
  const [multiProofsCompleted, setMultiProofsCompleted] = useState(0);
  const [multiProofsQueued, setMultiProofsQueued] = useState(0);

  useEffect(() => {
    if (options?.multi && !isZKEdDSAEventTicketPCDPackage(pcdPackage)) {
      setError("multi-proofs are only supported for ZKEdDSAEventTicketPCD");
      return;
    }

    setError(undefined);
  }, [args, options, pcdPackage]);

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
        if (pendingPCDResult.error.includes(OUTDATED_BROWSER_ERROR_MESSAGE)) {
          setError(getOutdatedBrowserErrorMessage());
        } else {
          setError(pendingPCDResult.error);
        }
        return;
      }

      onProve(undefined, undefined, pendingPCDResult.value);
    }
    if (options?.multi) {
      try {
        if (!pcdPackage) {
          throw new Error(`PCD package not found for ${pcdType}`);
        }

        if (!isZKEdDSAEventTicketPCDPackage(pcdPackage)) {
          throw new Error("multi-proofs are only available for tickets!");
        }

        let relevantPCDs = pcds
          .getAll()
          .filter((p) => p.type === EdDSATicketPCDTypeName);

        const ticketValidation =
          pcdPackage?.getProveDisplayOptions?.()?.defaultArgs?.["ticket"];
        if (ticketValidation) {
          relevantPCDs = pcds.getAll().filter((p) => {
            const ticketArg = args["ticket"];
            return ticketValidation.validate(p, ticketArg.validatorParams);
          });
        }

        setMultiProofsQueued(relevantPCDs.length);

        const result: SerializedPCD<ZKEdDSAEventTicketPCD>[] = [];

        for (const t of relevantPCDs) {
          const argsClone = _.clone(args) as ArgsOf<
            typeof ZKEdDSAEventTicketPCDPackage
          >;
          argsClone.ticket.value = await EdDSATicketPCDPackage.serialize(
            t as EdDSATicketPCD
          );
          const pcd = await pcdPackage.prove(argsClone);
          const serializedPCD = await pcdPackage.serialize(pcd);
          setMultiProofsCompleted((c) => c + 1);
          result.push(serializedPCD);
        }

        onProve(undefined, undefined, undefined, result);
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
  }, [
    pcdType,
    options?.proveOnServer,
    options?.multi,
    args,
    onProve,
    pcdPackage,
    pcds
  ]);

  return (
    <Container>
      {options?.description && <Description>{options.description}</Description>}

      {options?.debug && <pre>{JSON.stringify(args, null, 2)}</pre>}

      <PCDArgs
        args={args}
        setArgs={setArgs}
        options={pcdPackage?.getProveDisplayOptions?.()?.defaultArgs}
        proveOptions={options}
      />

      {folder && (
        <div>
          PCD will be added to folder: <br />
          <strong>{folder}</strong>
        </div>
      )}

      {error && <ErrorContainer>{error}</ErrorContainer>}

      {proving ? (
        options?.multi ? (
          <ProgressBar
            label="Proving"
            fractionCompleted={
              multiProofsCompleted / Math.max(1, multiProofsQueued)
            }
          />
        ) : (
          <RippleLoader />
        )
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
