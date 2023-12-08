import { Spacer } from "@pcd/passport-ui";
import { PCD } from "@pcd/pcd-types";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { useFilePicker } from "use-file-picker";
import { useDispatch, usePCDCollection } from "../../src/appHooks";
import { Button } from "../core";

type ImportState =
  | {
      valid: true;
      imported: false;
      pcds: PCD[];
      folders: FolderMap;
      conflicts: number;
    }
  | { valid: true; imported: true; added: number }
  | { valid: false };

type FolderMap = { [pcdId: string]: string };

export function AccountImportModal() {
  const { openFilePicker, filesContent } = useFilePicker({
    accept: ".json",
    multiple: false
  });

  const pcdCollection = usePCDCollection();
  const dispatch = useDispatch();

  const [importState, setImportState] = useState<ImportState | undefined>();

  const importPCDs = useCallback(() => {
    // Should never happen, but makes TypeScript happy that we checked for it
    if (!importState.valid || importState.imported === true) return;

    const addedPCDs: PCD[] = [];
    for (const pcd of importState.pcds) {
      if (!pcdCollection.hasPCDWithId(pcd.id)) {
        try {
          pcdCollection.add(pcd);
          if (importState.folders[pcd.id]) {
            pcdCollection.setFolder(pcd.id, importState.folders[pcd.id]);
          }

          addedPCDs.push(pcd);
        } catch (e) {
          console.log(e);
        }
      }

      setImportState({ valid: true, imported: true, added: addedPCDs.length });
    }
  }, [importState, pcdCollection]);

  useEffect(() => {
    (async () => {
      if (filesContent.length > 0) {
        try {
          const file = filesContent[0];
          const data = JSON.parse(file.content);

          if (data.pcds) {
            const serializedPcdCollection = JSON.parse(data.pcds);
            if (
              serializedPcdCollection.pcds &&
              serializedPcdCollection.folders
            ) {
              const pcds = await pcdCollection.deserializeAll(
                serializedPcdCollection.pcds
              );

              const folders: { [pcdId: string]: string } =
                serializedPcdCollection.folders;

              let conflicts = 0;
              for (const pcd of pcds) {
                if (pcdCollection.hasPCDWithId(pcd.id)) {
                  conflicts++;
                }
              }

              setImportState({
                valid: true,
                imported: false,
                pcds,
                folders,
                conflicts
              });
              return;
            }
          }

          setImportState({ valid: false });
        } catch (e) {
          setImportState({ valid: false });
        }
      }
    })();
  }, [filesContent, pcdCollection]);

  console.log(importState);

  return (
    <Container>
      <Spacer h={24} />
      {!importState && (
        <>
          <p>
            If you have previously exported a backup of your account, you can
            restore any lost PCDs by importing the backup data.
          </p>
          <p>Importing data will not overwrite any of your existing PCDs.</p>
          <p>To begin, select a backup file by clicking the button below.</p>
          <Spacer h={8} />
          <Button onClick={() => openFilePicker()}>Select file</Button>
          <Spacer h={8} />
        </>
      )}
      {importState && importState.valid && !(importState.imported === true) && (
        <>
          {importState.pcds.length <= importState.conflicts && (
            <>
              <p>
                The selected file does not contain any new PCDs. You may try to
                restore from another backup.
              </p>
              <Spacer h={8} />
              <Button onClick={() => openFilePicker()}>Select file</Button>
              <Spacer h={8} />
            </>
          )}
          {importState.pcds.length > importState.conflicts && (
            <>
              <p>
                The selected file contains{" "}
                <strong>
                  {importState.pcds.length - importState.conflicts}
                </strong>{" "}
                new PCDs.
              </p>
              <Spacer h={8} />
              <Button onClick={importPCDs}>Import PCDs</Button>
              <Spacer h={8} />
            </>
          )}
        </>
      )}
      {importState && importState.valid && importState.imported && (
        <>
          <p>
            Successfully added <strong>{importState.added}</strong> PCDs from
            the selected file.
          </p>
          <Spacer h={8} />
          <Button
            onClick={() =>
              dispatch({ type: "set-modal", modal: { modalType: "none" } })
            }
          >
            Close
          </Button>
          <Spacer h={8} />
        </>
      )}
      {importState && !importState.valid && (
        <>
          <p>
            The selected file is not a valid Zupass account backup. Please
            select a valid Zupass backup to import your data from.
          </p>
          <Spacer h={8} />
          <Button onClick={() => openFilePicker()}>Select file</Button>
          <Spacer h={8} />
        </>
      )}
    </Container>
  );
}

const Container = styled.div`
  padding: 24px;

  p {
    margin-bottom: 1rem;
  }
`;
