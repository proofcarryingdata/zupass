import { EmailPCDTypeName } from "@pcd/email-pcd";
import { deserializeStorage } from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import { PCDCollection } from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";
import { SemaphoreGroupPCDTypeName } from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDTypeName } from "@pcd/semaphore-identity-pcd";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { useFilePicker } from "use-file-picker";
import { useDispatch, useModal, usePCDCollection } from "../../src/appHooks";
import { getPackages } from "../../src/pcdPackages";
import { Button } from "../core";

// There are three main UI states that can occur after a user selects a file
// to import.
type ImportState =
  | { state: "ready" }
  // The selected file is valid, and the user can decide whether to import it.
  | {
      state: "valid-file-selected";
      collection: PCDCollection;
      pcdsToMergeIds: Set<PCD["id"]>;
    }
  // The import has been carried out, and `added` is the number of PCDs
  // imported.
  | { state: "import-complete" }
  // The selected file is not valid.
  | { state: "invalid-file" };

export function AccountImportModal() {
  const { openFilePicker, filesContent } = useFilePicker({
    accept: ".json",
    multiple: false,
    onFilesSelected: () => {
      setImportState({ state: "ready" });
    }
  });

  const modal = useModal();
  const pcdCollection = usePCDCollection();
  const dispatch = useDispatch();

  const [importState, setImportState] = useState<ImportState>({
    state: "ready"
  });

  // Called when a valid file has been selected, and the user chooses to import
  // PCDs from it.
  const importPCDs = useCallback(() => {
    // Should never happen, but makes TypeScript happy that we checked for it
    if (importState.state !== "valid-file-selected") return;

    dispatch({
      type: "merge-import",
      collection: importState.collection,
      pcdsToMergeIds: importState.pcdsToMergeIds
    });

    setImportState({ state: "import-complete" });
  }, [dispatch, importState]);

  // Responds to the user having selected a file to import, or to changes in
  // the user's current PCD collection.
  useEffect(() => {
    (async () => {
      // If a file has been selected, and isn't invalid or already imported
      if (
        filesContent.length > 0 &&
        importState.state !== "import-complete" &&
        importState.state !== "invalid-file"
      ) {
        let importedCollection: PCDCollection;

        // If the file hasn't been processed yet, process it
        if (importState.state === "ready") {
          try {
            // Parse the file content as JSON
            const storageExport = JSON.parse(filesContent[0].content);
            // Deserialize the storage - throws an error if the content is not
            // recognized
            const importedBackup = await deserializeStorage(
              storageExport,
              await getPackages()
            );
            importedCollection = importedBackup.pcds;
            if (!(importedCollection instanceof PCDCollection)) {
              throw new Error("Did not deserialize a valid PCD collection");
            }
          } catch (e) {
            // The file is not valid, so bail out
            setImportState({ state: "invalid-file" });
            return;
          }
        } else {
          importedCollection = importState.collection;
        }

        const userHasSemaphoreIdentity =
          pcdCollection.getPCDsByType(SemaphoreGroupPCDTypeName).length > 0;

        const userHasEmailPCD =
          pcdCollection.getPCDsByType(EmailPCDTypeName).length > 0;

        // Before importing, we want to filter the PCDs down to those which
        // are valid to import, so we can tell the user how many new PCDs to
        // expect
        const preImportFilter = (pcd: PCD) => {
          // If the user has a semaphore identity PCD, don't import another
          if (
            userHasSemaphoreIdentity &&
            pcd.type === SemaphoreIdentityPCDTypeName
          ) {
            return false;
          }

          // If the user has an email PCD, don't import another
          if (userHasEmailPCD && pcd.type === EmailPCDTypeName) {
            return false;
          }

          // If a PCD with this ID exists already, don't import it
          if (pcdCollection.hasPCDWithId(pcd.id)) {
            return false;
          }

          // Otherwise, do import it
          return true;
        };

        const pcdsToMerge = importedCollection.getAll().filter(preImportFilter);
        const pcdsToMergeIds = new Set(pcdsToMerge.map((pcd) => pcd.id));

        // Because this hook can be called multiple times, we should only
        // update the state if something has really changed
        if (
          // If the previous state was "ready", there's definitely a change
          importState.state === "ready" ||
          // If we have a new imported collection object, that's a change
          importState.collection !== importedCollection ||
          // If the set of PCDs to merge is different, that's a change
          importState.pcdsToMergeIds.size !== pcdsToMergeIds.size ||
          [...pcdsToMergeIds].find((id) => !importState.pcdsToMergeIds.has(id))
        ) {
          setImportState({
            state: "valid-file-selected",
            collection: importedCollection,
            pcdsToMergeIds: new Set(pcdsToMerge.map((pcd) => pcd.id))
          });
        }
      }
    })();
  }, [filesContent, importState, pcdCollection]);

  return (
    <Container>
      <Spacer h={24} />
      {importState.state === "ready" && (
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
      {importState.state === "valid-file-selected" && (
        <>
          {importState.pcdsToMergeIds.size == 0 && (
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
          {importState.pcdsToMergeIds.size > 0 && (
            <>
              <p>
                The selected file contains{" "}
                <strong>{importState.pcdsToMergeIds.size}</strong> new PCDs.
              </p>
              <Spacer h={8} />
              <Button onClick={importPCDs}>Import PCDs</Button>
              <Spacer h={8} />
            </>
          )}
        </>
      )}
      {importState.state === "import-complete" &&
        modal.modalType === "account-import" &&
        !modal.error && (
          <>
            <p>
              Successfully imported <strong>{modal.imported}</strong> PCDs from
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
      {importState.state === "import-complete" &&
        modal.modalType === "account-import" &&
        modal.error && (
          <>
            <p>{modal.error}</p>
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
      {importState.state === "invalid-file" && (
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
