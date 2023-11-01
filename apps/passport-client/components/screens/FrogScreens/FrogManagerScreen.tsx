import {
  CredentialManager,
  requestFrogCryptoDeleteFrogs,
  requestFrogCryptoManageFrogs
} from "@pcd/passport-interface";
import { FrogCryptoFrogData } from "@pcd/passport-interface/src/FrogCrypto";
import { Separator } from "@pcd/passport-ui";
import { SerializedPCD } from "@pcd/pcd-types";
import _ from "lodash";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import Table from "react-table-lite";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import {
  useCredentialCache,
  useIdentity,
  useIsSyncSettled,
  usePCDCollection
} from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { ErrorMessage } from "../../core/error";
import { AppContainer } from "../../shared/AppContainer";
import { SyncingPCDs } from "../../shared/SyncingPCDs";

export function FrogManagerScreen() {
  useSyncE2EEStorage();
  const syncSettled = useIsSyncSettled();

  const [newFrogs, setNewFrogs] = useState<FrogCryptoFrogData[]>([]);
  const [newFrogsError, setNewFrogsError] = useState<string>();
  const onTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const parsedData = frogParser(event.target.value);
      setNewFrogs(parsedData);
    } catch (error) {
      setNewFrogsError(error.message);
    }
  };

  const {
    result: frogs,
    isLoading,
    updateFrogs,
    deleteFrogs,
    error
  } = useFrogs();

  const [selectedFrogIds, setSelectedFrogIds] = useState<number[]>([]);
  useEffect(() => {
    setSelectedFrogIds([]);
  }, [frogs]);

  useEffect(() => {
    if (error?.includes("not authorized")) {
      alert("you're not admin, bye bye");
      window.location.replace("/");
    }
  }, [error]);

  if (!syncSettled) {
    return <SyncingPCDs />;
  }

  return (
    <AppContainer bg="gray">
      <Container>
        <h2>Add New Frogs</h2>
        <p>
          Go to the Export tab of the Frog data spreadsheet, click on Export
          JSON in the toolbar, and copy the generated JSON representation of
          frogs.
        </p>
        <textarea rows={10} onChange={onTextChange} />
        {newFrogsError && (
          <ErrorMessage>Error parsing frogs: {newFrogsError}</ErrorMessage>
        )}

        {newFrogs.length > 0 && (
          <>
            <h2>(Preview) New Frogs</h2>
            <DataTable data={newFrogs} />
            <button onClick={() => updateFrogs(newFrogs)}>Add Frogs</button>
          </>
        )}

        <Separator />

        <h2>Frogs</h2>
        {isLoading && <p>Loading...</p>}
        {error && <ErrorMessage>Error fetching frogs: {error}</ErrorMessage>}
        <button
          onClick={() => deleteFrogs(selectedFrogIds)}
          disabled={selectedFrogIds.length === 0}
        >
          Delete Selected Frogs{" "}
          {selectedFrogIds.length > 0 && `(${selectedFrogIds.length})`}
        </button>
        <DataTable
          data={frogs}
          checkedIds={selectedFrogIds}
          setCheckedIds={setSelectedFrogIds}
        />
      </Container>
    </AppContainer>
  );
}

function useFrogs(): {
  /**
   * All the frogs in the database. This always reflects the latest state of the database
   * after last request made here.
   */
  result: FrogCryptoFrogData[];
  isLoading: boolean;
  error: string | undefined;
  /**
   * Call this to upsert (replace) frogs in the database.
   */
  updateFrogs: (frogs: FrogCryptoFrogData[]) => void;
  /**
   * Call this to delete frogs in the database.
   */
  deleteFrogs: (frogIds: number[]) => void;
} {
  const [result, setResult] = useState<FrogCryptoFrogData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const identity = useIdentity();
  const pcds = usePCDCollection();
  const credentialCache = useCredentialCache();
  const credentialManager = useMemo(
    () => new CredentialManager(identity, pcds, credentialCache),
    [credentialCache, identity, pcds]
  );
  const [pcd, setPcd] = useState<SerializedPCD>();
  useEffect(() => {
    const fetchPcd = async () => {
      const pcd = await credentialManager.requestCredential({
        signatureType: "sempahore-signature-pcd"
      });
      setPcd(pcd);
    };
    fetchPcd();
  }, [credentialManager]);

  const [req, setReq] = useState<
    | { type: "load" }
    | { type: "update"; frogs: FrogCryptoFrogData[] }
    | { type: "delete"; frogIds: number[] }
  >({ type: "load" });

  // ensure only one request is in flight at a time
  useEffect(() => {
    const abortController = new AbortController();

    const doRequest = async () => {
      if (!pcd) {
        setError("Waiting for PCD to be ready");
        return;
      }

      try {
        setError(undefined);
        setIsLoading(true);

        let result;
        switch (req.type) {
          case "load":
            result = await requestFrogCryptoManageFrogs(
              appConfig.zupassServer,
              {
                pcd,
                frogs: []
              }
            );
            break;
          case "update":
            result = await requestFrogCryptoManageFrogs(
              appConfig.zupassServer,
              { pcd, frogs: req.frogs }
            );
            break;
          case "delete":
            result = await requestFrogCryptoDeleteFrogs(
              appConfig.zupassServer,
              { pcd, frogIds: req.frogIds }
            );
            break;
        }

        if (abortController.signal.aborted) {
          return;
        }
        if (result.success) {
          setResult(result.value.frogs);
        } else {
          setError(result.error);
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setError(error.message);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };
    doRequest();

    return () => {
      abortController.abort();
    };
  }, [pcd, req]);

  return {
    result,
    isLoading,
    error,
    updateFrogs: (frogs) => setReq({ type: "update", frogs }),
    deleteFrogs: (frogIds) => setReq({ type: "delete", frogIds })
  };
}

function DataTable({
  data,
  checkedIds,
  setCheckedIds
}: {
  data: Record<string, any>[];
  checkedIds?: number[];
  setCheckedIds?: Dispatch<SetStateAction<number[]>>;
}) {
  const keys =
    data.length > 0
      ? _.chain(data).map(Object.keys).flatten().uniq().value()
      : [];

  const dataWithChecked = data.map((row) => ({
    ...row,
    checked: checkedIds?.includes(row.id)
  }));

  return (
    <Table
      data={dataWithChecked}
      headers={keys}
      noDataMessage="No Frogs"
      checkedKey="checked"
      showMultiSelect={!!setCheckedIds}
      customRenderCell={keys.reduce((acc, key) => {
        acc[key] = (row) => {
          return typeof row[key] === "undefined" ? "<undefined>" : row[key];
        };
        acc["description"] = (row) => {
          return (
            <Description title={row["description"]}>
              {row["description"]}
            </Description>
          );
        };
        return acc;
      }, {})}
      onRowSelect={(args, row) => {
        setCheckedIds?.((rowIds) =>
          row.checked
            ? rowIds.filter((id) => id !== row.id)
            : [...rowIds, row.id]
        );
      }}
      onAllRowSelect={(args, allrows) => {
        setCheckedIds?.((ids) =>
          ids.length === allrows.length ? [] : allrows.map((row) => row.id)
        );
      }}
      containerStyle={{ maxHeight: "400px", overflow: "auto" }}
      cellStyle={{ padding: "4px" }}
      headerStyle={{ padding: "4px" }}
    />
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100vw;
  max-width: 100vw;
  overflow-x: auto;

  display: flex;
  flex-direction: column;
  gap: 16px;
`;

/**
 * Parses the data from the frog spreadsheet into a format that can be used by the
 * `requestFrogCryptoManageFrogs` API.
 *
 * @param data The data from the frog spreadsheet as a JSON array of Record<attr name, attr val>.
 * Numeric range value can be empty, a single number, or a range of numbers separated by a dash.
 * Enum values can be empty or a string. They are matched to numeric enum at the time of issuance.
 */
function frogParser(data: string): FrogCryptoFrogData[] {
  return JSON.parse(data).map((rawFrog) => {
    function parseAttribtue(
      attribute: string
    ): [number, number] | [undefined, undefined] {
      const value = String(rawFrog[attribute] ?? "").trim();
      if (!value) {
        return [undefined, undefined];
      }

      if (value.includes("-")) {
        const [min, max] = value.split("-").map((v) => +v.trim());
        return [min, max];
      }

      const parsed = +value;
      return [parsed, parsed];
    }
    const [jump_min, jump_max] = parseAttribtue("jump");
    const [speed_min, speed_max] = parseAttribtue("speed");
    const [intelligence_min, intelligence_max] = parseAttribtue("intelligence");
    const [beauty_min, beauty_max] = parseAttribtue("beauty");

    return {
      id: +rawFrog.frogId,
      uuid: rawFrog.uuid,
      name: rawFrog.name,
      description: rawFrog.description,
      biome: rawFrog.biome,
      rarity: rawFrog.rarity,
      temperament: rawFrog.temperament || undefined,
      drop_weight: +rawFrog.dropWeight,
      jump_min,
      jump_max,
      speed_min,
      speed_max,
      intelligence_min,
      intelligence_max,
      beauty_min,
      beauty_max
    } satisfies FrogCryptoFrogData;
  });
}

const Description = styled.span`
  display: -webkit-box;
  max-width: 200px;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;
