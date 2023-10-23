import {
  PCDGetRequest,
  PCDRequestType,
  PendingPCD,
  requestProveOnServer
} from "@pcd/passport-interface";
import { Separator } from "@pcd/passport-ui";
import {
  ArgsOf,
  BigIntArgument,
  PCD,
  SerializedPCD,
  StringArrayArgument,
  isPCDArgument
} from "@pcd/pcd-types";
import { getErrorMessage } from "@pcd/util";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import _ from "lodash";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import { useDispatch, usePCDCollection, useSelf } from "../../../src/appHooks";
import {
  safeRedirect,
  safeRedirectPending
} from "../../../src/passportRequest";
import { useAppRollbar } from "../../../src/useAppRollbar";
import { err, nextFrame } from "../../../src/util";
import { Button, Spacer } from "../../core";
import { Chip, ChipsContainer } from "../../core/Chip";
import { RippleLoader } from "../../core/RippleLoader";
import { icons } from "../../icons";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { PCDArgs } from "../../shared/PCDArgs";

export function ZKEdDSAEventTicketProveScreen({
  req
}: {
  req: PCDGetRequest<typeof ZKEdDSAEventTicketPCDPackage>;
}) {
  const dispatch = useDispatch();
  const rollbar = useAppRollbar();
  const pcds = usePCDCollection();
  const [args, setArgs] = useState<ArgsOf<typeof req.args>>(
    JSON.parse(JSON.stringify(req.args))
  );
  const [error, setError] = useState<string | undefined>();
  const [proving, setProving] = useState(false);
  const pcdPackage = pcds.getPackage<typeof ZKEdDSAEventTicketPCDPackage>(
    req.pcdType
  );

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

  const onProve = useCallback(
    async (_pcd: PCD, serialized: SerializedPCD, pendingPCD: PendingPCD) => {
      if (pendingPCD) {
        safeRedirectPending(req.returnUrl, pendingPCD);
      } else {
        safeRedirect(req.returnUrl, serialized);
      }
    },
    [req.returnUrl]
  );

  const onProveClick = useCallback(async () => {
    setProving(true);
    setError(undefined);

    // Give the UI has a chance to update to the 'loading' state before the
    // potentially blocking proving operation kicks off
    await nextFrame();

    if (req.options?.proveOnServer === true) {
      const pendingPCDResult = await requestProveOnServer(
        appConfig.zupassServer,
        {
          pcdType: req.pcdType,
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
  }, [
    args,
    onProve,
    pcdPackage,
    req.options?.proveOnServer,
    req.pcdType,
    rollbar
  ]);

  const defaultArgs = useMemo(
    () => pcdPackage.getProveDisplayOptions?.()?.defaultArgs,
    [pcdPackage]
  );
  const hiddenArgs = useMemo(
    () =>
      _.pickBy(
        args,
        (arg, key) =>
          !(arg.defaultVisible ?? defaultArgs[key]?.defaultVisible ?? true)
      ),
    [args, defaultArgs]
  );
  const title = useMemo(
    () => req.options?.title ?? req.pcdType,
    [req.options?.title, req.pcdType]
  );

  // NB: Because we doesn't render the ticket PCDArg by default
  // we must surface ticket not found error here.
  const pcdCollection = usePCDCollection();
  const notFoundMessage = useMemo(() => {
    const validatorParams = args.ticket.validatorParams;
    return (
      validatorParams?.notFoundMessage || "You don't have any eligible tickets."
    );
  }, [args.ticket.validatorParams]);
  const ticketNotFound = useMemo(() => {
    const validatorParams = args.ticket.validatorParams;
    const pcds = pcdCollection.getPCDsByType(args.ticket.pcdType);
    if (pcds.length === 0) {
      return true;
    }

    const validate = defaultArgs?.ticket?.validate;
    if (!validate || !validatorParams) {
      return false;
    }

    const validPCDs = pcds.filter((pcd) => validate(pcd, validatorParams));
    return validPCDs.length === 0;
  }, [
    args.ticket.pcdType,
    args.ticket.validatorParams,
    defaultArgs?.ticket?.validate,
    pcdCollection
  ]);

  if (req.type !== PCDRequestType.Get) {
    err(dispatch, "Unsupported request", `Expected a PCD GET request`);
    return null;
  }

  return (
    <>
      <MaybeModal fullScreen isProveOrAddScreen />
      <AppContainer bg="gray">
        <Container>
          <Title>
            {title === "ZuKat" ? (
              <>
                <img
                  src="/images/zucat.jpg"
                  draggable={false}
                  width={64}
                  height={64}
                  style={{ borderRadius: "50%" }}
                />
                <span>{title}</span>
              </>
            ) : (
              title
            )}
          </Title>

          {req.options?.description && (
            <Description>{req.options.description}</Description>
          )}

          <Identity />

          <Divider />

          <RevealedFields args={args} />

          <Divider />

          <PCDArgs args={hiddenArgs} setArgs={setArgs} options={defaultArgs} />

          {ticketNotFound ? (
            <ErrorContainer>{notFoundMessage}</ErrorContainer>
          ) : (
            error && <ErrorContainer>{error}</ErrorContainer>
          )}

          {req.options?.debug && <pre>{JSON.stringify(args, null, 2)}</pre>}

          {proving ? (
            <RippleLoader />
          ) : (
            !ticketNotFound && (
              <Button disabled={!isProveReady} onClick={onProveClick}>
                Generate Proof
              </Button>
            )
          )}
        </Container>
        <Spacer h={64} />
      </AppContainer>
    </>
  );
}

function Identity() {
  const self = useSelf();
  const dispatch = useDispatch();

  return (
    <Email>
      Logged in as <span>{self.email}</span>
      <a
        onClick={() =>
          dispatch({ type: "set-modal", modal: { modalType: "settings" } })
        }
      >
        Not you?
      </a>
    </Email>
  );
}

function RevealedFields({
  args
}: {
  args: ArgsOf<typeof ZKEdDSAEventTicketPCDPackage>;
}) {
  const revealSemaphoreId =
    !!args.fieldsToReveal.value?.revealAttendeeSemaphoreId;

  return (
    <Container>
      <Heading>This proof will reveal:</Heading>
      {/* Revealed fields */}
      <RevealedEvents validEventIds={args.validEventIds} />
      {revealSemaphoreId && (
        <RevealedSemaphoreId revealed={revealSemaphoreId} />
      )}
      <RevealedTicketFields
        fieldsMap={args.fieldsToReveal.value ?? {}}
        revealed
      />
      <RevealedWatermark watermark={args.watermark} />
      {/* Not Revealed fields */}
      <RevealedTicketFields
        fieldsMap={args.fieldsToReveal.value ?? {}}
        revealed={false}
      />
      {!revealSemaphoreId && (
        <RevealedSemaphoreId revealed={revealSemaphoreId} />
      )}
    </Container>
  );
}

function RevealedEvents({
  validEventIds
}: {
  validEventIds: StringArrayArgument;
}) {
  const eventNames = useMemo<string[]>(() => {
    try {
      return JSON.parse(validEventIds.description);
    } catch (e) {
      console.debug("Failed to parse event names", e);
      return validEventIds.value;
    }
  }, [validEventIds.description, validEventIds.value]);

  if (!eventNames || eventNames.length === 0) {
    return null;
  }

  return (
    <RevealedField
      revealed
      text={
        eventNames.length > 1
          ? "You have a ticket to one of these events"
          : "You have a ticket to this event"
      }
    >
      <ChipsContainer direction="row">
        {eventNames.map((event) => (
          <Chip key={event} label={event} checked />
        ))}
      </ChipsContainer>
    </RevealedField>
  );
}

function RevealedWatermark({ watermark }: { watermark: BigIntArgument }) {
  if (!watermark.value) {
    return null;
  }

  return (
    <RevealedField revealed text={watermark.displayName || "A watermark value"}>
      {watermark.description ? (
        <ExpandableText>{watermark.description}</ExpandableText>
      ) : (
        !watermark.displayName && (
          <ExpandableText>{watermark.value}</ExpandableText>
        )
      )}
    </RevealedField>
  );
}

function ExpandableText({ children }: { children: string }) {
  const [expanded, setExpanded] = useState(false);

  const onClick = useCallback(() => {
    setExpanded((expanded) => !expanded);
  }, []);

  return (
    <ExpandablePre onClick={onClick} expanded={expanded}>
      {expanded ? children : children.slice(0, 50)}
    </ExpandablePre>
  );
}

function RevealedTicketFields({
  fieldsMap,
  revealed
}: {
  fieldsMap: EdDSATicketFieldsToReveal;
  revealed: boolean;
}) {
  const fields = Object.keys(fieldsMap)
    .filter((key) => key !== "revealAttendeeSemaphoreId")
    .filter((key) => fieldsMap[key] === revealed)
    .map((key) => key.replace(/^reveal/, ""))
    .map(_.startCase);

  if (revealed ? fields.length === 0 : fields.length > 0) {
    return null;
  }

  return (
    <RevealedField
      revealed={revealed}
      text="Other information about your ticket"
    >
      <ChipsContainer direction="row">
        {fields.map((field) => (
          <Chip key={field} label={field} checked />
        ))}
      </ChipsContainer>
    </RevealedField>
  );
}

function RevealedSemaphoreId({ revealed }: { revealed: boolean }) {
  return <RevealedField revealed={revealed} text="Your Zupass Semaphore ID" />;
}

function RevealedField({
  revealed,
  text,
  children
}: {
  revealed: boolean;
  text: string;
  children?: ReactNode;
}) {
  return (
    <FieldContainer>
      <img
        src={revealed ? icons.checkCircle : icons.crossCircle}
        draggable={false}
      />
      <div>
        <span>{text}</span>
        {children}
      </div>
    </FieldContainer>
  );
}

const Title = styled.div`
  font-size: 20px;
  font-weight: 700;
  line-height: 24px;
  margin: 0 auto;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const Description = styled.div`
  font-size: 16px;
  line-height: 20px;
  text-align: center;
  margin: 0 auto;
  color: rgba(var(--white-rgb), 0.8);
`;

const Heading = styled.h2`
  font-weight: 700;
  font-size: 12px;
  line-height: 16px;
  margin: 0;
  color: rgba(var(--white-rgb), 0.8);
  text-transform: uppercase;
  margin-bottom: 8px;
`;

const Email = styled.div`
  font-weight: 300;
  font-size: 14px;
  line-height: 18px;

  color: rgba(var(--white-rgb), 0.6);
  text-align: center;
  margin: 0 auto;

  & > span {
    color: var(--white);
  }
  & > a {
    display: block;
    cursor: pointer;
  }
`;

const ErrorContainer = styled.div`
  width: 100%;
  padding: 8px;
  background-color: var(--bg-dark-primary);
  color: var(--danger-bright);
  border-radius: 16px;
  border: 1px solid var(--danger-bright);
  text-align: center;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  width: 100%;
`;

const FieldContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;

  & > img {
    width: 24px;
    height: 24px;
  }
  & > div {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    overflow: hidden;

    & > span {
      font-weight: 500;
      font-size: 16px;
      line-height: 20px;
      margin: 2px 0;
    }
  }
`;

const Divider = styled(Separator)`
  margin: 8px 0;
`;

const ExpandablePre = styled.pre<{ expanded: boolean }>`
  cursor: pointer;
  word-break: ${(p) => (p.expanded ? "break-all" : "normal")};
  white-space: ${(p) => (p.expanded ? "break-spaces" : "pre")};
  text-overflow: ${(p) => (p.expanded ? "unset" : "ellipsis")};
  overflow: ${(p) => (p.expanded ? "auto" : "hidden")};
  font-size: 14px;
  line-height: 18px;
  max-height: ${(p) => (p.expanded ? "72px" : "18px")};
`;
