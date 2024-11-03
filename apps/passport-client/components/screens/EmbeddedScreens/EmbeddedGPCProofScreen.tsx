import { ProveResult } from "@parcnet-js/client-rpc";
import * as p from "@parcnet-js/podspec";
import { EntriesSchema, PodspecProofRequest } from "@parcnet-js/podspec";
import { GPCIdentifier, gpcProve } from "@pcd/gpc";
import { POD, POD_INT_MAX, POD_INT_MIN } from "@pcd/pod";
import {
  PODTicketPCD,
  PODTicketPCDTypeName,
  ticketToPOD
} from "@pcd/pod-ticket-pcd";
import { v3tov4Identity } from "@pcd/semaphore-identity-pcd";
import { ReactNode, useMemo, useState } from "react";
import styled from "styled-components";
import { BottomModalHeader } from "../../../new-components/shared/BottomModal";
import { Button2 } from "../../../new-components/shared/Button";
import { NewLoader } from "../../../new-components/shared/NewLoader";
import { Typography } from "../../../new-components/shared/Typography";
import { hideScrollCSS } from "../../../new-components/shared/utils";
import {
  useIdentityV3,
  usePCDCollection,
  useZappOrigin
} from "../../../src/appHooks";
import { BANNER_HEIGHT } from "../../../src/sharedConstants";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { getGPCArtifactsURL } from "../../../src/util";
import { getPODsForCollections } from "../../../src/zapp/collections";
import { AppContainer } from "../../shared/AppContainer";
import Select from "../../shared/Select";
import { displayPODValue } from "../../shared/uiUtil";

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

  const textOrLoader = (text: string): ReactNode => {
    if (proving) return <NewLoader columns={3} rows={2} color="white" />;
    return (
      <Typography color="inherit" fontSize={18} fontWeight={500} family="Rubik">
        {text}
      </Typography>
    );
  };
  return (
    <AppContainer noPadding bg="white">
      <Container>
        <InnerContainer>
          <BottomModalHeader
            title="GPC PROOF REQUEST"
            description="This proof will reveal the following data from your PODs:"
          />
          <PodsContainer>
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
          </PodsContainer>
        </InnerContainer>
        <Button2
          disabled={!canProve || proving}
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
              getGPCArtifactsURL(window.location.origin)
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
          {textOrLoader("Prove")}
        </Button2>
      </Container>
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
  const zapp = useZappOrigin();
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
        entry.type !== "null" &&
        (!!entry.isMemberOf ||
          !!entry.isNotMemberOf ||
          !!(entry.type === "int" && entry.inRange))
    );
  const defaultOption = {
    value: "",
    label: "-- None selected --"
  };

  const options: { label: string; value: string }[] = [
    defaultOption,
    ...pods.map((pod) => {
      return {
        value: pod.signature,
        label: schema.pod.meta?.labelEntry
          ? displayPODValue(pod.content.asEntries()[schema.pod.meta.labelEntry])
          : pod.signature.substring(0, 16)
      };
    })
  ];
  return (
    <PODInfo>
      <PODSelectContainer>
        <Typography
          family="Rubik"
          color="var(--text-tertiary)"
          fontWeight={700}
          style={{ padding: "8px 12px" }}
        >
          {name.toUpperCase()}
        </Typography>
        <Select
          defaultValue={defaultOption}
          onChange={(ev) => {
            onChange(pods.find((pod) => pod.signature === ev?.value));
          }}
          options={options}
        />
      </PODSelectContainer>
      <ContentContainer>
        {revealedEntries.length > 0 && (
          <RevealedEntriesContainer>
            <Typography family="Rubik">{zapp} will be able to see</Typography>
            <EntryBox>
              {revealedEntries.map(([entryName, _]) => {
                return (
                  <EntryItem>
                    <Typography family="Rubik" color="var(--core-accent)">
                      {entryName}
                    </Typography>
                    <Typography family="Rubik" color="var(--core-accent)">
                      {selectedPODEntries?.[entryName] !== undefined
                        ? displayPODValue(selectedPODEntries?.[entryName])
                        : "-"}
                    </Typography>
                  </EntryItem>
                );
              })}
            </EntryBox>
          </RevealedEntriesContainer>
        )}
        {schema.owner && (
          <EntryBox>
            <Typography family="Rubik" color="var(--core-accent)">
              Entry {schema.owner.entry} must match your{" "}
              {schema.owner.protocol === "SemaphoreV3"
                ? "Semaphore commitment"
                : "public key"}
            </Typography>
          </EntryBox>
        )}
        <Typography
          family="Rubik"
          color="var(--text-tertiary)"
          onClick={() => setShowOtherStatements(!showOtherStatements)}
          fontWeight={500}
          style={{ cursor: "pointer" }}
        >
          {showOtherStatements
            ? "Hide other statements ▼"
            : "Show other statements ▶"}
        </Typography>
        {showOtherStatements && (
          <>
            {entriesWithConstraints.length > 0 && (
              <ConstraintsContainer>
                <Typography family="Rubik">
                  {zapp} wants to evaluate if:
                </Typography>
                <EntryBox>
                  {entriesWithConstraints.map(([entryName, entry]) => {
                    return (
                      <ConstraintItem key={`${name}-${entryName}-constraints`}>
                        {entry.type !== "null" && entry.isMemberOf && (
                          <Typography color="var(--core-accent)" family="Rubik">
                            <EntryName>{entryName}</EntryName> is member of
                            list:{" "}
                            <Reveal>
                              {entry.isMemberOf
                                .map((v) => displayPODValue(v))
                                .join(", ")}
                            </Reveal>
                          </Typography>
                        )}
                        {entry.type !== "null" && entry.isNotMemberOf && (
                          <Typography color="var(--core-accent)" family="Rubik">
                            <EntryName>{entryName}</EntryName> is not member of
                            list:{" "}
                            <Reveal>
                              {entry.isNotMemberOf
                                .map((v) => displayPODValue(v))
                                .join(", ")}
                            </Reveal>
                          </Typography>
                        )}
                        {entry.type === "int" && entry.inRange && (
                          <Typography family="Rubik" color="var(--core-accent)">
                            {entryName} is{" "}
                            <Typography
                              family="Rubik"
                              color="var(--core-accent)"
                              fontWeight={700}
                            >
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
                            </Typography>
                          </Typography>
                        )}
                      </ConstraintItem>
                    );
                  })}
                </EntryBox>
              </ConstraintsContainer>
            )}
            {schema.pod.tuples && (
              <>
                <Typography family="Rubik">tuples:</Typography>
                <EntryBox>
                  {schema.pod.tuples.map((tuple) => {
                    return (
                      <div key={tuple.entries.join(",")}>
                        <Typography color="var(--core-accent)" family="Rubik">
                          Entries{" "}
                        </Typography>
                        {tuple.entries.length === 2 ? (
                          <Typography
                            family="Rubik"
                            color="var(--core-accent)"
                            fontWeight={600}
                          >
                            {tuple.entries[0]} and{" "}
                          </Typography>
                        ) : (
                          <>
                            {tuple.entries.slice(0, -1).map((entry) => (
                              <Typography
                                family="Rubik"
                                fontWeight={600}
                                color="var(--core-accent)"
                                key={entry}
                              >
                                {entry},{" "}
                              </Typography>
                            ))}
                            and{" "}
                          </>
                        )}
                        <Typography
                          color="var(--core-accent)"
                          fontWeight={600}
                          family="Rubik"
                        >
                          {tuple.entries[tuple.entries.length - 1]}
                        </Typography>{" "}
                        <Typography color="var(--core-accent)" family="Rubik">
                          must {tuple.isNotMemberOf ? "not " : ""}match a list:
                        </Typography>
                        <Reveal>
                          {(tuple.isNotMemberOf ?? tuple.isMemberOf ?? [])
                            .map((v) =>
                              v.map((e) => displayPODValue(e)).join(", ")
                            )
                            .map((item) => (
                              <Typography
                                color="var(--core-accent)"
                                family="Rubik"
                              >
                                {item}
                              </Typography>
                            ))}
                        </Reveal>
                      </div>
                    );
                  })}
                </EntryBox>
              </>
            )}
          </>
        )}
      </ContentContainer>
    </PODInfo>
  );
}

function Reveal({ children }: { children: ReactNode }): ReactNode {
  const [isRevealed, setIsRevealed] = useState(false);
  return (
    <>
      <RevealButton onClick={() => setIsRevealed(!isRevealed)}>
        <Typography color="#fff" family="Rubik" fontWeight={500}>
          {isRevealed ? "Hide" : "Show"}
        </Typography>
      </RevealButton>
      {isRevealed && <div className="my-1">{children}</div>}
    </>
  );
}

const RevealButton = styled.button`
  padding: 0px 4px;
  border-radius: 2px;
  background: var(--core-accent);
  border: none;
  cursor: pointer;
  display: block;
`;

const PODInfo = styled.div`
  display: flex;
  padding: 4px;
  flex-direction: column;
  align-items: center;
  align-self: stretch;
  border-radius: 10px;
  border: 1px solid #eceaf4;
  background: #f6f8fd;
  width: 100%;
`;

const PODSelectContainer = styled.label`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const EntryName = styled.span`
  font-weight: 600;
`;

const ConstraintsContainer = styled.div`
  margin-top: 8px;
`;

const ConstraintItem = styled.div`
  margin-bottom: 4px;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: calc(100vh - ${BANNER_HEIGHT}px);
  padding: 24px 24px 20px 24px;
  width: 100%;
  gap: 16px;
`;

const EntryBox = styled.div`
  display: flex;
  padding: 12px;
  flex-direction: column;
  border-radius: 8px;
  background: #e9efff;
  width: 100%;
`;

const EntryItem = styled.div`
  display: flex;
  justify-content: space-between;
`;

const RevealedEntriesContainer = styled.div`
  display: flex;
  flex-direction: column;
`;
const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 12px;
`;

const InnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  overflow: hidden;
`;

const PodsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  flex: 1;
  overflow: scroll;
  ${hideScrollCSS}
`;
