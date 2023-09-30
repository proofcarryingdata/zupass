import { useCallback } from "react";
import { useDispatch } from "../../src/appHooks";
import { Button, CenterColumn, Spacer, TextCenter } from "../core";
import { LinkButton } from "../core/Button";
import { icons } from "../icons";

export function SettingsModal() {
  const dispatch = useDispatch();

  const close = useCallback(() => {
    dispatch({ type: "set-modal", modal: "" });
  }, [dispatch]);

  const clearZupass = useCallback(() => {
    if (window.confirm("Are you sure you want to log out?")) {
      dispatch({ type: "reset-passport" });
    }
  }, [dispatch]);

  return (
    <>
      <TextCenter>
        <img
          draggable="false"
          src={icons.settingsPrimary}
          width={34}
          height={34}
        />
      </TextCenter>
      <Spacer h={24} />
      <CenterColumn>
        <LinkButton to="/scan">Scan Ticket</LinkButton>
        <Spacer h={16} />
        <LinkButton to="/change-password" onClick={close}>
          Change Password
        </LinkButton>
        <Spacer h={16} />
        <LinkButton
          to="/subscriptions"
          onClick={() => dispatch({ type: "set-modal", modal: "" })}
        >
          Manage Subscriptions
        </LinkButton>
        <Spacer h={16} />
        <Button onClick={clearZupass} style="danger">
          Log Out
        </Button>
      </CenterColumn>
    </>
  );
}
