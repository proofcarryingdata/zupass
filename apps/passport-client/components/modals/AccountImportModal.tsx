import { deserializeStorage } from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import { PCDCollection } from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { useFilePicker } from "use-file-picker";
import { useDispatch, usePCDCollection } from "../../src/appHooks";
import { getPackages } from "../../src/pcdPackages";
import { Button } from "../core";

// There are three main UI states that can occur after a user selects a file
// to import.
type ImportState =
  // The selected file is valid, and the user can decide whether to import it.
  | {
      valid: true;
      imported: false;
      // The PCDs contained in the import which do *not* already exist in the
      // user's PCD collection (as determined by ID-match).
      pcds: PCD[];
      folders: FolderMap;
    }
  // The import has been carried out, and `added` is the number of PCDs
  // imported.
  | { valid: true; imported: true; added: number }
  // The selected file is not valid.
  | { valid: false };

type FolderMap = PCDCollection["folders"];

export function AccountImportModal() {
  const { openFilePicker, filesContent } = useFilePicker({
    accept: ".json",
    multiple: false
  });

  const pcdCollection = usePCDCollection();
  const dispatch = useDispatch();

  const [importState, setImportState] = useState<ImportState | undefined>();

  // Called when a valid file has been selected, and the user chooses to import
  // PCDs from it.
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

  // Responds to the user having selected a file to import
  useEffect(() => {
    (async () => {
      // If a file has been selected
      if (filesContent.length > 0) {
        try {
          // Parse the file content as JSON
          const storageExport = JSON.parse(filesContent[0].content);
          // Deserialize the storage - throws an error if the content is not
          // recognized
          const importedBackup = await deserializeStorage(
            storageExport,
            await getPackages()
          );

          // Filter out PCDs whose IDs are already present in the user's PCD
          // collection
          const pcds = importedBackup.pcds.getAll().filter((pcd) => {
            return !pcdCollection.hasPCDWithId(pcd.id);
          });

          const folders = importedBackup.pcds.folders;

          setImportState({
            valid: true,
            imported: false,
            pcds,
            folders
          });
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
          {importState.pcds.length == 0 && (
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
          {importState.pcds.length > 0 && (
            <>
              <p>
                The selected file contains{" "}
                <strong>{importState.pcds.length}</strong> new PCDs.
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
