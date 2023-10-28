import {
  CredentialManager,
  requestFrogCryptoManageFrogs
} from "@pcd/passport-interface";
import { FrogCryptoFrogData } from "@pcd/passport-interface/src/FrogCrypto";
import { SerializedPCD } from "@pcd/pcd-types";
import { useEffect, useMemo, useState } from "react";
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
  const handleFileChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const parsedData = frogParser(event.target.value);
      setNewFrogs(parsedData);
    } catch (error) {
      setNewFrogsError(error.message);
    }
  };

  const { result: frogs, isLoading, refetch, error } = useFrogs();

  useEffect(() => {
    if (error?.includes("not authorized")) {
      window.location.replace("/");
    }
  }, [error]);

  if (!syncSettled) {
    return <SyncingPCDs />;
  }

  return (
    <AppContainer bg="gray">
      <Container>
        <textarea onChange={handleFileChange} />
        {newFrogsError && (
          <ErrorMessage>Error parsing CSV: {newFrogsError}</ErrorMessage>
        )}

        {newFrogs.length > 0 && (
          <>
            <h2>New Frogs</h2>
            <DataTable data={newFrogs} />
            <button onClick={() => refetch(newFrogs)}>Add Frogs</button>
          </>
        )}

        <h2>Frogs</h2>
        {isLoading && <p>Loading...</p>}
        {error && <ErrorMessage>Error fetching frogs: {error}</ErrorMessage>}
        {!error && frogs.length === 0 && <p>No frogs</p>}
        <DataTable data={frogs} />
      </Container>
    </AppContainer>
  );
}

function useFrogs(): {
  result: FrogCryptoFrogData[];
  isLoading: boolean;
  error: string | undefined;
  refetch: (frogs: FrogCryptoFrogData[]) => void;
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
  const [inputFrogs, setInputFrogs] = useState<FrogCryptoFrogData[]>([]);
  useEffect(() => {
    const fetchPcd = async () => {
      const pcd = await credentialManager.requestCredential({
        signatureType: "sempahore-signature-pcd"
      });
      setPcd(pcd);
    };
    fetchPcd();
  }, [credentialManager]);

  const req = useMemo(
    () => ({
      pcd,
      frogs: inputFrogs
    }),
    [inputFrogs, pcd]
  );

  useEffect(() => {
    const abortController = new AbortController();

    const fetchFrogs = async () => {
      if (!req.pcd) {
        setError("Waiting for PCD to be ready");
        return;
      }

      try {
        setError(undefined);
        setIsLoading(true);
        const result = await requestFrogCryptoManageFrogs(
          appConfig.zupassServer,
          req
        );
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
    fetchFrogs();

    return () => {
      abortController.abort();
    };
  }, [req]);

  return {
    result,
    isLoading,
    error,
    refetch: setInputFrogs
  };
}

function DataTable({ data }: { data: Record<string, any>[] }) {
  // Get the keys from the first object. Assumes all objects have the same shape.
  const keys = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <table>
      <thead>
        <tr>
          {keys.map((key, idx) => (
            <th key={idx}>{key}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item, rowIndex) => (
          <tr key={rowIndex}>
            {keys.map((key, colIndex) => (
              <td key={colIndex}>
                {typeof item[key] === "undefined" ? "<undefined>" : item[key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100%;
  height: 100%;
  max-width: 100%;

  display: flex;
  flex-direction: column;
  gap: 16px;
`;

function frogParser(data: string): FrogCryptoFrogData[] {
  return JSON.parse(data).map((rawFrog) => {
    function parseAttribtue(
      attribute: string
    ): [number, number] | [undefined, undefined] {
      const value = String(rawFrog[attribute] || "");
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
    };
  });
}
