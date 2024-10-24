import { ProveResult } from "@parcnet-js/client-rpc";
import * as p from "@parcnet-js/podspec";
import { EntriesSchema, PodspecProofRequest } from "@parcnet-js/podspec";
import { GPCIdentifier, gpcProve } from "@pcd/gpc";
import { Button, Spacer } from "@pcd/passport-ui";
import { POD, POD_INT_MAX, POD_INT_MIN } from "@pcd/pod";
import {
  PODTicketPCD,
  PODTicketPCDTypeName,
  ticketToPOD
} from "@pcd/pod-ticket-pcd";
import { v3tov4Identity } from "@pcd/semaphore-identity-pcd";
import { Fragment, ReactNode, useMemo, useState } from "react";
import styled from "styled-components";
import { useIdentityV3, usePCDCollection } from "../../../src/appHooks";
import { ZUPASS_GPC_ARTIFACT_PATH } from "../../../src/sharedConstants";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { getPODsForCollections } from "../../../src/zapp/collections";
import { H2 } from "../../core";
import { AppContainer } from "../../shared/AppContainer";
import { Spinner } from "../../shared/Spinner";

export function EmbeddedGPCProofScreen({
  proofRequestSchema,
  collectionIds,
  circuitIdentifier,
  callback
}: {
  proofRequestSchema: PodspecProofRequest;
  collectionIds: string[];
  circuitIdentifier?: GPCIdentifier;
  callback: (result: ProveResult) => void;
}): ReactNode {
  useSyncE2EEStorage();
  const prs = useMemo(() => {
    return p.proofRequest(proofRequestSchema);
  }, [proofRequestSchema]);
  const [selectedPODs, setSelectedPODs] = useState<
    Record<string, POD | undefined>
  >({});
  const pcds = usePCDCollection();
  const allPods = useMemo(() => {
    const pods = getPODsForCollections(pcds, collectionIds);
    const ticketPods = pcds
      .getPCDsByType(PODTicketPCDTypeName)
      .map((pcd) => {
        try {
          return ticketToPOD(pcd as PODTicketPCD);
        } catch (e) {
          return undefined;
        }
      })
      .filter((p) => !!p) as POD[];

    pods.push(...ticketPods);
    return pods;
  }, [pcds, collectionIds]);
  const candidatePODs = useMemo(() => {
    return prs.queryForInputs(allPods);
  }, [allPods, prs]);
  const proofRequest = useMemo(() => {
    return prs.getProofRequest();
  }, [prs]);
  const canProve = useMemo(() => {
    return (
      Object.keys(selectedPODs).length ===
        Object.keys(proofRequestSchema.pods).length &&
      Object.values(selectedPODs).every((maybePod) => !!maybePod)
    );
  }, [selectedPODs, proofRequestSchema]);
  const [proving, setProving] = useState(false);
  const identity = useIdentityV3();

  return (
    <AppContainer bg="primary">
      <Spacer h={4} />
      <H2
        style={{
          flex: 1,
          textAlign: "center",
          marginBottom: "8px"
        }}
      >
        GPC Proof Request
      </H2>
      <div>
        <Description>
          This proof will reveal the following data from your PODs:
        </Description>
        <Spacer h={4} />
        {Object.entries(proofRequestSchema.pods).map(([name, schema]) => {
          return (
            <ProvePODInfo
              key={name}
              name={name}
              schema={schema}
              pods={candidatePODs[name]}
              selectedPOD={selectedPODs[name]}
              onChange={(pod) => {
                setSelectedPODs({
                  ...selectedPODs,
                  [name]: pod
                });
              }}
            />
          );
        })}
        <Spacer h={4} />
        <div>
          <Button
            disabled={!canProve}
            onClick={() => {
              setProving(true);

              gpcProve(
                {
                  ...proofRequest.proofConfig,
                  ...(circuitIdentifier ? { circuitIdentifier } : {})
                },
                {
                  pods: selectedPODs as Record<string, POD>,
                  membershipLists: proofRequest.membershipLists,
                  watermark: proofRequest.watermark,
                  owner: {
                    semaphoreV4: v3tov4Identity(identity),
                    externalNullifier: proofRequest.externalNullifier
                  }
                },
                new URL(
                  ZUPASS_GPC_ARTIFACT_PATH,
                  window.location.origin
                ).toString()
              )
                .then((proof) => {
                  callback({
                    success: true,
                    proof: proof.proof,
                    boundConfig: proof.boundConfig,
                    revealedClaims: proof.revealedClaims
                  });
                })
                .catch((error) => console.error(error))
                .finally(() => setProving(false));
            }}
          >
            <Spinner text={proving ? "Proving..." : "Prove"} show={proving} />
          </Button>
        </div>
      </div>
    </AppContainer>
  );
}

function ProvePODInfo({
  name,
  schema,
  pods,
  selectedPOD,
  onChange
}: {
  name: string;
  schema: p.ProofConfigPODSchema<EntriesSchema>;
  pods: POD[];
  selectedPOD: POD | undefined;
  onChange: (pod: POD | undefined) => void;
}): ReactNode {
  const [showOtherStatements, setShowOtherStatements] = useState(false);
  const revealedEntries = Object.entries(schema.pod.entries)
    .map(([name, entry]) => {
      if (entry.type === "optional") {
        entry = entry.innerType;
      }
      return [name, entry] as const;
    })
    .filter(([name, _entry]) => schema.revealed?.[name] ?? false);

  const selectedPODEntries = selectedPOD?.content.asEntries();

  const entriesWithConstraints = Object.entries(schema.pod.entries)
    .map(([name, entry]) => {
      if (entry.type === "optional") {
        entry = entry.innerType;
      }
      return [name, entry] as const;
    })
    .filter(
      ([_, entry]) =>
        !!entry.isMemberOf ||
        !!entry.isNotMemberOf ||
        !!(entry.type === "int" && entry.inRange)
    );

  return (
    <PODInfo>
      <PODSelectContainer>
        <PODName>{name}</PODName>
        <select
          className="block w-full rounded-md bg-gray-800 border-transparent focus:border-gray-500 focus:ring-0 p-2 text-sm"
          value={selectedPOD?.signature ?? ""}
          onChange={(ev) => {
            onChange(pods.find((pod) => pod.signature === ev.target.value));
          }}
        >
          <option value="" disabled>
            -- None selected --
          </option>
          {pods.map((pod) => {
            return (
              <option key={pod.signature} value={pod.signature}>
                {schema.pod.meta?.labelEntry
                  ? pod.content
                      .asEntries()
                      [schema.pod.meta.labelEntry].value.toString()
                  : pod.signature.substring(0, 16)}
              </option>
            );
          })}
        </select>
      </PODSelectContainer>
      <RevealedEntriesTitle>
        {revealedEntries.length > 0 && "Revealed entries:"}
      </RevealedEntriesTitle>
      <RevealedEntriesGrid>
        {revealedEntries.map(([entryName, _]) => {
          return (
            <Fragment key={`${name}-${entryName}`}>
              <EntryName>{entryName}</EntryName>
              <EntryValue>
                {selectedPODEntries?.[entryName].value.toString() ?? "-"}
              </EntryValue>
            </Fragment>
          );
        })}
      </RevealedEntriesGrid>
      {schema.owner && (
        <OwnerStatement>
          Entry <EntryName>{schema.owner.entry}</EntryName> must match your{" "}
          {schema.owner.protocol === "SemaphoreV3"
            ? "Semaphore commitment"
            : "public key"}
        </OwnerStatement>
      )}
      <OtherStatementsButton
        onClick={() => setShowOtherStatements(!showOtherStatements)}
      >
        {showOtherStatements
          ? "Hide other statements ▼"
          : "Show other statements ▶"}
      </OtherStatementsButton>
      {showOtherStatements && (
        <>
          {entriesWithConstraints.length > 0 && (
            <ConstraintsContainer>
              <ConstraintsTitle>Proven constraints:</ConstraintsTitle>
              {entriesWithConstraints.map(([entryName, entry]) => {
                return (
                  <ConstraintItem key={`${name}-${entryName}-constraints`}>
                    {entry.isMemberOf && (
                      <ConstraintText>
                        <EntryName>{entryName}</EntryName> is member of list:{" "}
                        <Reveal>
                          <ConstraintList>
                            {entry.isMemberOf
                              .map((v) => v.value.toString())
                              .join(", ")}
                          </ConstraintList>
                        </Reveal>
                      </ConstraintText>
                    )}
                    {entry.isNotMemberOf && (
                      <ConstraintText>
                        <EntryName>{entryName}</EntryName> is not member of
                        list:{" "}
                        <Reveal>
                          <ConstraintList>
                            {entry.isNotMemberOf
                              .map((v) => v.value.toString())
                              .join(", ")}
                          </ConstraintList>
                        </Reveal>
                      </ConstraintText>
                    )}
                    {entry.type === "int" && entry.inRange && (
                      <ConstraintText>
                        <EntryName>{entryName}</EntryName> is
                        <ConstraintValue>
                          {entry.inRange.min === POD_INT_MIN &&
                            entry.inRange.max === POD_INT_MAX &&
                            "any number"}
                          {entry.inRange.min !== POD_INT_MIN &&
                            entry.inRange.max === POD_INT_MAX &&
                            `greater than ${entry.inRange.min}`}
                          {entry.inRange.min === POD_INT_MIN &&
                            entry.inRange.max !== POD_INT_MAX &&
                            `less than ${entry.inRange.max}`}
                          {entry.inRange.min !== POD_INT_MIN &&
                            entry.inRange.max !== POD_INT_MAX &&
                            `between ${entry.inRange.min} and ${entry.inRange.max}`}
                        </ConstraintValue>
                      </ConstraintText>
                    )}
                  </ConstraintItem>
                );
              })}
            </ConstraintsContainer>
          )}
          {schema.pod.tuples && (
            <TuplesContainer>
              <TuplesTitle>Tuples:</TuplesTitle>
              {schema.pod.tuples.map((tuple) => {
                return (
                  <TupleItem key={tuple.entries.join(",")}>
                    Entries{" "}
                    {tuple.entries.length === 2 ? (
                      <>
                        <EntryName>{tuple.entries[0]}</EntryName> and{" "}
                      </>
                    ) : (
                      <>
                        {tuple.entries.slice(0, -1).map((entry) => (
                          <EntryName key={entry}>{entry}, </EntryName>
                        ))}
                        and{" "}
                      </>
                    )}
                    <EntryName>
                      {tuple.entries[tuple.entries.length - 1]}
                    </EntryName>{" "}
                    must {tuple.isNotMemberOf ? "not " : ""}match a list:
                    <br />
                    <Reveal>
                      <ConstraintList>
                        {(tuple.isNotMemberOf ?? tuple.isMemberOf ?? [])
                          .map((v) =>
                            v.map((e) => e.value.toString()).join(", ")
                          )
                          .map((item) => (
                            <div>{item}</div>
                          ))}
                      </ConstraintList>
                    </Reveal>
                  </TupleItem>
                );
              })}
            </TuplesContainer>
          )}
        </>
      )}
    </PODInfo>
  );
}

function Reveal({ children }: { children: ReactNode }): ReactNode {
  const [isRevealed, setIsRevealed] = useState(false);
  return (
    <>
      <button onClick={() => setIsRevealed(!isRevealed)}>
        {isRevealed ? "Hide" : "Reveal"}
      </button>
      {isRevealed && <div className="my-1">{children}</div>}
    </>
  );
}

const Description = styled.div`
  font-size: 14px;
  color: rgba(var(--white-rgb), 0.8);
`;

const PODInfo = styled.div`
  margin: 8px 0px;
  border: 1px solid rgba(var(--white-rgb), 0.1);
  border-radius: 8px;
  padding: 12px;
`;

const PODName = styled.div`
  font-weight: 600;
  text-transform: capitalize;
`;

const PODSelectContainer = styled.label`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const RevealedEntriesTitle = styled.div`
  margin-top: 16px;
  margin-bottom: 4px;
  font-weight: 600;
`;

const RevealedEntriesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  align-items: center;
  margin-bottom: 16px;
`;

const EntryName = styled.span`
  font-weight: 600;
`;

const EntryValue = styled.div`
  padding: 2px 8px;
  border-radius: 4px;
  background-color: rgba(var(--black-rgb), 0.3);
`;

const ConstraintsContainer = styled.div`
  margin-top: 8px;
`;

const ConstraintsTitle = styled.div`
  font-weight: 600;
  margin-bottom: 8px;
`;

const ConstraintItem = styled.div`
  margin-bottom: 8px;
`;

const ConstraintText = styled.div``;

const ConstraintValue = styled.span`
  margin: 0px 4px;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgba(var(--black-rgb), 0.3);
`;

const ConstraintList = styled.div`
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgba(var(--black-rgb), 0.3);
`;

const TuplesContainer = styled.div`
  margin-top: 8px;
`;

const TuplesTitle = styled.div`
  font-weight: 600;
  margin-bottom: 8px;
`;

const TupleItem = styled.div`
  margin-bottom: 12px;
`;

const OtherStatementsButton = styled.button`
  border: 0px;
  background: none;
  color: rgb(var(--white-rgb));
  cursor: pointer;
  font-size: 14px;
  padding: 0px;
  margin: 8px 0px;
`;

const OwnerStatement = styled.div`
  margin-top: 8px;
  margin-bottom: 8px;
`;
