import { EmailPCDTypeName } from "@pcd/email-pcd";
import { deserializeStorage } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";
import { SemaphoreGroupPCDTypeName } from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDTypeName } from "@pcd/semaphore-identity-pcd";
import { ReactNode, useCallback, useState } from "react";
import styled from "styled-components";
import { useFilePicker } from "use-file-picker";
import { NewLoader } from "../../../../../packages/lib/passport-ui/src/NewLoader";
import {
  useBottomModal,
  useDispatch,
  usePCDCollection
} from "../../../src/appHooks";
import { getPackages } from "../../../src/pcdPackages";
import { AppState } from "../../../src/state";
import { useSelector } from "../../../src/subscribe";
import { BottomModal } from "../BottomModal";
import { Button2 } from "../Button";
import { Typography } from "../Typography";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Folder = styled.label`
  display: flex;
  column-gap: 0.5rem;
`;

const Folders = styled.div`
  margin-top: 0.5rem;
  margin-bottom: 1rem;
`;

export function useImportScreenState():
  | { imported?: number; error?: string }
  | undefined {
  return useSelector<AppState["importScreen"]>((s) => s.importScreen, []);
}

type ImportState =
  // Initial state
  | { state: "initial" }
  // The selected file is valid, and the user can decide whether to import it.
  | {
      state: "valid-file-selected";
      // The collection parsed from the selected file
      collection: PCDCollection;

      // The PCD IDs referring to PCDs which are valid to import
      mergeablePcdIds: Set<PCD["id"]>;
      // The folders the user has selected in the UI
      selectedFolders: Set<string>;
      // The PCD IDs that are valid and within the selected folders
      selectedPcdIds: Set<PCD["id"]>;
      // The count of valid PCDs in each importable folder
      folderCounts: Record<string, number>;
    }
  // The import has been carried out, and `added` is the number of PCDs
  // imported.
  | { state: "import-complete" }
  // The selected file is not valid.
  | { state: "invalid-file" };

export const ImportModal = (): ReactNode => {
  const activeModal = useBottomModal();
  const existingPcdCollection = usePCDCollection();
  const dispatch = useDispatch();
  const [importState, setImportState] = useState<ImportState>({
    state: "initial"
  });
  const importEventState = useImportScreenState();

  // since the import action is not a seperate page anymore, we have to manually stop the sync when the import is in progress
  const pauseSync = useCallback(
    (): Promise<void> => dispatch({ type: "pauseSync", value: true }),
    [dispatch]
  );
  const continueSync = useCallback(
    (): Promise<void> => dispatch({ type: "pauseSync", value: false }),
    [dispatch]
  );

  const reset = (goBackSettings: boolean): void => {
    continueSync();
    setImportState({ state: "initial" });
    if (goBackSettings) {
      dispatch({
        type: "set-bottom-modal",
        modal: {
          modalType: "settings"
        }
      });
    }
  };

  const { openFilePicker } = useFilePicker({
    accept: ".json",
    multiple: false,
    onFilesSelected: async ({ filesContent }) => {
      let parsedCollection: PCDCollection;
      try {
        pauseSync();
        // Parse the file content as JSON
        const storageExport = JSON.parse(filesContent[0].content);
        // Deserialize the storage - throws an error if the content is not
        // recognized
        parsedCollection = (
          await deserializeStorage(storageExport, await getPackages())
        ).pcds;
      } catch (e) {
        continueSync();
        // The file is not valid, so bail out
        console.log(e);
        setImportState({ state: "invalid-file" });
        return;
      }

      const userHasSemaphoreIdentity =
        existingPcdCollection.getPCDsByType(SemaphoreGroupPCDTypeName).length >
        0;

      const userHasEmailPCD =
        existingPcdCollection.getPCDsByType(EmailPCDTypeName).length > 0;

      const preImportFilter = (pcd: PCD): boolean => {
        if (
          userHasSemaphoreIdentity &&
          pcd.type === SemaphoreIdentityPCDTypeName
        ) {
          return false;
        }
        if (userHasEmailPCD && pcd.type === EmailPCDTypeName) {
          return false;
        }
        if (existingPcdCollection.hasPCDWithId(pcd.id)) {
          return false;
        }
        // Otherwise, do import it
        return true;
      };

      const mergeablePcds: PCD[] = parsedCollection
        .getAll()
        .filter(preImportFilter);

      // Create a map of the folders these PCDs belong to, to a count of
      // the number of PCDs in each folder, with the string "" used for
      // PCDs belonging to no folder.
      const pcdFolders: Record<string, number> = mergeablePcds.reduce(
        (folders, pcd) => {
          const folder = parsedCollection.getFolderOfPCD(pcd.id) ?? "";
          if (folder in folders) {
            folders[folder]++;
          } else {
            folders[folder] = 1;
          }
          return folders;
        },
        {} as Record<string, number>
      );

      // The set of foders that the user has chosen to import.
      const selectedFolders: Set<string> = new Set([
        "",
        ...Object.keys(pcdFolders)
      ]);

      setImportState({
        state: "valid-file-selected",
        collection: parsedCollection,
        mergeablePcdIds: new Set(mergeablePcds.map((pcd) => pcd.id)),
        selectedFolders,
        // mergeablePcds is the set of valid PCDs
        // We want to filter this to remove any PCDs that belong to
        // folders *not* selected by the user.
        selectedPcdIds: new Set(
          mergeablePcds
            .filter((pcd) => {
              // Get the folder for the PCD (using "" to represent the
              // main folder).
              const folder = parsedCollection.getFolderOfPCD(pcd.id) ?? "";
              // Keep this PCD in the merge if its folder was selected
              return selectedFolders.has(folder);
            })
            .map((pcd) => pcd.id)
        ),
        folderCounts: pcdFolders
      });
    }
  });

  const importPCDs = useCallback(() => {
    // Should never happen, but makes TypeScript happy that we checked for it
    if (importState.state !== "valid-file-selected") return;
    dispatch({
      type: "merge-import",
      collection: importState.collection,
      pcdsToMergeIds: importState.selectedPcdIds
    });
    setImportState({ state: "import-complete" });
    continueSync();
  }, [dispatch, importState, continueSync]);

  const toggleFolder = useCallback(
    (folder: string) => {
      if (importState.state === "valid-file-selected") {
        const { selectedPcdIds, collection, selectedFolders } = importState;
        if (selectedFolders.has(folder)) {
          selectedFolders.delete(folder);

          const pcdsToRemove = collection.getAllPCDsInFolder(folder);
          pcdsToRemove.forEach((pcd) => selectedPcdIds.delete(pcd.id));
        } else {
          selectedFolders.add(folder);
          const pcdsToAdd = collection.getAllPCDsInFolder(folder);
          pcdsToAdd.forEach((pcd) => selectedPcdIds.add(pcd.id));
        }
        setImportState({ ...importState, selectedFolders, selectedPcdIds });
      }
    },
    [importState]
  );

  const initialState = (
    <>
      <TextContainer>
        <Typography fontWeight={800} fontSize={20}>
          IMPORT BACKUP DATA
        </Typography>
        <Typography fontSize={16} family="Rubik">
          If you have previously exported a backup of your account, you can
          import the backed-up PODs by selecting the backup file. Importing data
          will not overwrite any of your existing PODs. To begin, select a
          backup file by clicking the button below.
        </Typography>
      </TextContainer>
      <ButtonsContainer>
        <Button2 onClick={openFilePicker}>Select file</Button2>
        <Button2
          variant="secondary"
          onClick={() => {
            reset(true);
          }}
        >
          Back
        </Button2>
      </ButtonsContainer>
    </>
  );
  const emptyImporState = (
    <>
      <TextContainer>
        <Typography fontWeight={800} fontSize={20}>
          NO PCDS FOUND
        </Typography>
        <Typography fontSize={16}>
          The file you uploaded didn't contain new PCDs, please try a different
          file.
        </Typography>
      </TextContainer>
      <ButtonsContainer>
        <Button2
          variant="secondary"
          onClick={() => {
            reset(false);
          }}
        >
          Back
        </Button2>
      </ButtonsContainer>
    </>
  );
  return (
    <BottomModal
      isOpen={activeModal.modalType === "import"}
      onClickOutside={() => {
        reset(false);
      }}
    >
      <Container>
        {importState.state === "initial" && initialState}

        {importState.state === "valid-file-selected" &&
          importState.mergeablePcdIds.size <= 0 &&
          emptyImporState}
        {importState.state === "valid-file-selected" &&
          importState.mergeablePcdIds.size > 0 && (
            <>
              <TextContainer>
                <Typography fontSize={16} fontWeight={400} family="Rubik">
                  The selected file contains{" "}
                  <Typography fontWeight={700}>
                    {importState.mergeablePcdIds.size}
                  </Typography>{" "}
                  new PCDs
                </Typography>
                <div>
                  <Typography fontSize={16} fontWeight={400} family="Rubik">
                    Import PCDs from the following backed-up folders:
                  </Typography>
                  <Folders>
                    {Object.entries(importState.folderCounts).map(
                      ([folder, count]) => {
                        return (
                          <Folder key={folder === "" ? "Main Folder" : folder}>
                            <input
                              type="checkbox"
                              checked={importState.selectedFolders.has(folder)}
                              onChange={(): void => toggleFolder(folder)}
                            ></input>
                            <Typography fontSize={16} fontWeight={500}>
                              {folder === "" ? "Main Folder" : folder} ({count})
                            </Typography>
                          </Folder>
                        );
                      }
                    )}
                  </Folders>
                </div>
                <Button2
                  onClick={importPCDs}
                  disabled={importState.selectedFolders.size === 0}
                >
                  Import{" "}
                  {Object.entries(importState.folderCounts).reduce(
                    (total, [folder, count]) =>
                      total +
                      (importState.selectedFolders.has(folder) ? count : 0),
                    0
                  )}{" "}
                  PCDs
                </Button2>
              </TextContainer>
            </>
          )}
        {importState.state === "import-complete" && !importEventState && (
          <NewLoader columns={5} rows={5} />
        )}
        {importEventState &&
          importEventState.imported !== undefined &&
          importState.state === "import-complete" && (
            <>
              <TextContainer>
                <Typography fontWeight={800} fontSize={20}>
                  IMPORT COMPLETED
                </Typography>
                <Typography fontSize={16} fontWeight={500}>
                  Successfully imported{" "}
                  <Typography fontWeight={700}>
                    {importEventState.imported}
                  </Typography>{" "}
                  PCDs from the selected file
                </Typography>
              </TextContainer>
              <Button2
                variant="secondary"
                onClick={() => {
                  reset(true);
                }}
              >
                Back
              </Button2>
            </>
          )}
        {importState.state === "invalid-file" && (
          <>
            <TextContainer>
              <Typography fontWeight={800} fontSize={20}>
                ERROR IMPORTING PODS
              </Typography>
              <Typography fontSize={16} fontWeight={500}>
                The selected file is not a valid Zupass account backup. Please
                select a valid Zupass backup to import your data from.
              </Typography>
            </TextContainer>
            <Button2
              onClick={() => {
                openFilePicker();
              }}
            >
              Select file
            </Button2>
          </>
        )}

        {importEventState && importEventState.error !== undefined && (
          <>
            <TextContainer>
              <Typography fontWeight={800} fontSize={20}>
                ERROR IMPORTING PODS
              </Typography>
              <Typography fontSize={16} fontWeight={500}>
                {importEventState.error}
              </Typography>
            </TextContainer>
            <Button2
              variant="secondary"
              onClick={() => {
                reset(true);
              }}
            >
              Back
            </Button2>
          </>
        )}
      </Container>
    </BottomModal>
  );
};
