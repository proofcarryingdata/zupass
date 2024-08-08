import { TextButton } from "@pcd/passport-ui";
import { useCallback, useState } from "react";
import { IoSettingsOutline } from "react-icons/io5";
import { useLocalStorage } from "usehooks-ts";
import {
  useDispatch,
  useHasSetupPassword,
  usePCDCollection,
  useSelf,
  useStateContext
} from "../../src/appHooks";
import { savePCDs } from "../../src/localstorage";
import { BigInput, Button, CenterColumn, Spacer, TextCenter } from "../core";
import { NewButton } from "../NewButton";
import { initTestData } from "../screens/HomeScreen/utils";
import { AccountExportButton } from "../shared/AccountExportButton";

export function SettingsModal({
  isProveOrAddScreen
}: {
  isProveOrAddScreen: boolean;
}): JSX.Element {
  const dispatch = useDispatch();
  const self = useSelf();
  const state = useStateContext().getState();
  const hasSetupPassword = useHasSetupPassword();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [added, setAdded] = useState(false);
  const pcds = usePCDCollection();

  const closeModal = useCallback(() => {
    dispatch({ type: "set-modal", modal: { modalType: "none" } });
  }, [dispatch]);

  const logout = useCallback(() => {
    if (window.confirm("Are you sure you want to log out?")) {
      dispatch({ type: "reset-passport" });
    }
  }, [dispatch]);

  const [justDevcon, setJustDevcon] = useLocalStorage("justDevcon", false);
  const toggleJustDevcon = useCallback(() => {
    setJustDevcon((prev) => !prev);
  }, [setJustDevcon]);

  const onAddTestData = useCallback(() => {
    setAdded(true);
    initTestData(state, true);
  }, [state]);

  const deleteAccount = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      ) &&
      window.confirm("Are you really sure?")
    ) {
      dispatch({ type: "delete-account" });
    } else {
      setDeleteMessage("");
    }
  }, [dispatch]);

  return (
    <>
      <TextCenter>
        <IoSettingsOutline color={"#468c80"} size={34} />
      </TextCenter>
      <Spacer h={16} />
      <CenterColumn>
        <TextCenter>{self?.email}</TextCenter>

        <Spacer h={16} />

        {!isProveOrAddScreen && !showAdvanced && (
          <>
            <NewButton
              className="w-full"
              onClick={(): void => {
                dispatch({ type: "set-modal", modal: { modalType: "none" } });
                window.location.href = "/scan";
              }}
            >
              Scan Ticket
            </NewButton>
            <Spacer h={16} />
            <NewButton
              className="w-full"
              onClick={() => {
                closeModal();
                window.location.href = "/#/change-password";
              }}
            >
              {hasSetupPassword ? "Change" : "Add"} Password
            </NewButton>
            <Spacer h={16} />
            <AccountExportButton />
            <Spacer h={16} />
            <NewButton
              className="w-full"
              onClick={() => {
                closeModal();
                window.location.href = "/#/import";
              }}
            >
              Import
            </NewButton>
            <Spacer h={16} />
          </>
        )}

        {!showAdvanced && (
          <>
            <NewButton className="w-full" onClick={logout}>
              Log Out
            </NewButton>
            <Spacer h={16} />
            <NewButton className="w-full" onClick={toggleJustDevcon}>
              {justDevcon ? "Showing Just Devcon" : "Showing Everything"}
            </NewButton>
            <Spacer h={16} />
            <NewButton
              className="w-full"
              onClick={onAddTestData}
              disabled={added}
            >
              {added ? "Added" : "Add Test Data"}
            </NewButton>
            <Spacer h={16} />
            <NewButton
              className="w-full"
              onClick={async () => {
                pcds.meta = {};
                await savePCDs(pcds);
                window.location.reload();
              }}
              disabled={added}
            >
              Reset Metadata
            </NewButton>
          </>
        )}

        {!isProveOrAddScreen &&
          (showAdvanced ? (
            <>
              <Button onClick={() => setShowAdvanced(!showAdvanced)}>
                Back
              </Button>
              <Spacer h={12} />
              <Button
                onClick={deleteAccount}
                style="danger"
                disabled={deleteMessage !== "delete me"}
              >
                Delete Account
              </Button>
              <Spacer h={12} />
              <BigInput
                placeholder="type 'delete me' to delete"
                value={deleteMessage}
                onChange={(e) => setDeleteMessage(e.target.value)}
              />
            </>
          ) : (
            <>
              <Spacer h={12} />
              <TextButton onClick={() => setShowAdvanced(!showAdvanced)}>
                Delete Account
              </TextButton>
            </>
          ))}
      </CenterColumn>
    </>
  );
}
