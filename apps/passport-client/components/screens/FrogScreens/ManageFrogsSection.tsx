import {
  FrogCryptoFrogData,
  FrogCryptoFrogDataSchema,
  requestFrogCryptoDeleteFrogs,
  requestFrogCryptoUpdateFrogs
} from "@pcd/passport-interface";
import { Separator } from "@pcd/passport-ui";
import { SerializedPCD } from "@pcd/pcd-types";
import _ from "lodash";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import Table from "react-table-lite";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import { useCredentialManager } from "../../../src/appHooks";
import { ErrorMessage } from "../../core/error";
import { useAdminError } from "./useAdminError";

export function ManageFrogsSection(): JSX.Element {
  const [newFrogs, setNewFrogs] = useState<FrogCryptoFrogData[]>([]);
  const [newFrogsError, setNewFrogsError] = useState<string>();
  const onTextChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ): void => {
    try {
      const parsedData = frogParser(event.target.value);
      setNewFrogs(parsedData);
      setNewFrogsError(undefined);
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

  useAdminError(error);

  return (
    <>
      <h2>Add New Frogs</h2>
      <p>
        Go to the Export tab of the Frog data spreadsheet, click on Export JSON
        in the toolbar, and copy the generated JSON representation of frogs.
      </p>
      <textarea rows={10} onChange={onTextChange} />
      {newFrogsError && (
        <ErrorMessage>Error parsing frogs: {newFrogsError}</ErrorMessage>
      )}

      {newFrogs.length > 0 && (
        <>
          <h2>(Preview) New/Updated Frogs</h2>
          <DataTable data={newFrogs} />
          <button onClick={(): void => updateFrogs(newFrogs)}>
            Add/Update Frogs
          </button>
        </>
      )}

      <Separator />

      <h2>Frogs</h2>
      {isLoading && <p>Loading...</p>}
      {error && <ErrorMessage>Error fetching frogs: {error}</ErrorMessage>}
      <button
        onClick={(): void => deleteFrogs(selectedFrogIds)}
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
    </>
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

  const credentialManager = useCredentialManager();
  const [pcd, setPcd] = useState<SerializedPCD>();
  useEffect(() => {
    const fetchPcd = async (): Promise<void> => {
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

    const doRequest = async (): Promise<void> => {
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
            result = await requestFrogCryptoUpdateFrogs(
              appConfig.zupassServer,
              {
                pcd,
                frogs: []
              }
            );
            break;
          case "update":
            result = await requestFrogCryptoUpdateFrogs(
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

/**
 * Parses the data from the frog spreadsheet into a format that can be used by the
 * `requestFrogCryptoUpdateFrogs` API.
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

    const frogData = {
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

    try {
      FrogCryptoFrogDataSchema.parse(frogData);
    } catch (e) {
      console.error(e);
      throw new Error(`Invalid frog data: ${JSON.stringify(frogData)}`);
    }

    return frogData;
  });
}

export function DataTable({
  data,
  checkedIds,
  setCheckedIds
}: {
  data: FrogCryptoFrogData[];
  checkedIds?: number[];
  setCheckedIds?: Dispatch<SetStateAction<number[]>>;
}): JSX.Element {
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
      customRenderCell={{
        ...keys.reduce((acc, key) => {
          acc[key] = (row): any => {
            return typeof row[key] === "undefined" ? "<undefined>" : row[key];
          };
          return acc;
        }, {}),
        description: (row): JSX.Element => {
          return (
            <Description title={row["description"]}>
              {row["description"]}
            </Description>
          );
        }
      }}
      onRowSelect={(args, row): void => {
        setCheckedIds?.((rowIds) =>
          row.checked
            ? rowIds.filter((id) => id !== row.id)
            : [...rowIds, row.id]
        );
      }}
      onAllRowSelect={(args, allrows): void => {
        setCheckedIds?.((ids) =>
          ids.length === allrows.length ? [] : allrows.map((row) => row.id)
        );
      }}
      containerStyle={{ maxHeight: "400px", overflow: "auto" }}
      cellStyle={{ padding: "8px" }}
      headerStyle={{ padding: "8px" }}
    />
  );
}

const Description = styled.span`
  display: -webkit-box;
  max-width: 200px;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;
