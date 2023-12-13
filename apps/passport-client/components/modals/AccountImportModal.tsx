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
  // The selected file is valid, and the user can decide whether to import it.
  | {
      valid: true;
      imported: false;
      collection: PCDCollection;
      pcdsToMergeIds: Set<PCD["id"]>;
    }
  // The import has been carried out, and `added` is the number of PCDs
  // imported.
  | { valid: true; imported: true }
  // The selected file is not valid.
  | { valid: false };

export function AccountImportModal() {
  const { openFilePicker, filesContent } = useFilePicker({
    accept: ".json",
    multiple: false
  });

  const modal = useModal();
  const pcdCollection = usePCDCollection();
  const dispatch = useDispatch();

  const [importState, setImportState] = useState<ImportState | undefined>();

  // Called when a valid file has been selected, and the user chooses to import
  // PCDs from it.
  const importPCDs = useCallback(() => {
    // Should never happen, but makes TypeScript happy that we checked for it
    if (!importState.valid || importState.imported === true) return;

    dispatch({
      type: "merge-import",
      collection: importState.collection,
      pcdsToMergeIds: importState.pcdsToMergeIds
    });

    setImportState({ valid: true, imported: true });
  }, [dispatch, importState]);

  // Responds to the user having selected a file to import
  useEffect(() => {
    (async () => {
      // If a file has been selected
      if (filesContent.length > 0 && !importState?.valid) {
        try {
          // Parse the file content as JSON
          const storageExport = JSON.parse(filesContent[0].content);
          // Deserialize the storage - throws an error if the content is not
          // recognized
          const importedBackup = await deserializeStorage(
            storageExport,
            await getPackages()
          );

          const userHasSemaphoreIdentity =
            pcdCollection.getPCDsByType(SemaphoreGroupPCDTypeName).length > 0;

          // Before importing, we want to filter the PCDs down to those which
          // are valid to import
          const preImportFilter = (pcd: PCD) => {
            // If the user has a semaphore identity PCD, don't import another
            if (
              userHasSemaphoreIdentity &&
              pcd.type === SemaphoreIdentityPCDTypeName
            ) {
              return false;
            }

            // If a PCD with this ID exists already, don't import it
            if (pcdCollection.hasPCDWithId(pcd.id)) {
              return false;
            }

            // Otherwise, do import it
            return true;
          };

          const pcdsToMerge = importedBackup.pcds
            .getAll()
            .filter(preImportFilter);

          setImportState({
            valid: true,
            imported: false,
            collection: importedBackup.pcds,
            pcdsToMergeIds: new Set(pcdsToMerge.map((pcd) => pcd.id))
          });
        } catch (e) {
          setImportState({ valid: false });
        }
      }
    })();
  }, [filesContent, importState, pcdCollection]);

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
      {importState &&
        importState.valid &&
        importState.imported &&
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
      {importState &&
        importState.valid &&
        importState.imported &&
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
