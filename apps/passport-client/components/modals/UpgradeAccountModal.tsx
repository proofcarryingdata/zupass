import { useCallback, useState } from "react";
import styled from "styled-components";
import { useDispatch, useSelf } from "../../src/appHooks";
import { setPassword } from "../../src/password";
import { BigInput, H2, Spacer } from "../core";
import { NewPasswordForm } from "../shared/NewPasswordForm";

/**
 * This uncloseable modal is shown to users of Zupass who have a sync key,
 * and have never created a password. It asks them to create a password.
 */
export function UpgradeAccountModal() {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const self = useSelf();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const onAddPassword = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await setPassword(newPassword, dispatch);

      dispatch({
        type: "set-modal",
        modal: { modalType: "changed-password" }
      });
    } catch (e) {
      setError("Couldn't set a password - try again later");
    } finally {
      setLoading(false);
    }
  }, [loading, newPassword, dispatch]);

  return (
    <Container>
      <H2>Upgrade Your Account</H2>
      <Spacer h={24} />
      Zupass now supports logging in with a password! To continue to use Zupass,
      you must choose a password. Make sure to remember it, otherwise you will
      lose access to all your PCDs.
      <Spacer h={24} />
      <BigInput value={self.email} disabled={true} />
      <Spacer h={8} />
      <NewPasswordForm
        error={error}
        setError={setError}
        passwordInputPlaceholder="New password"
        email={self.email}
        revealPassword={revealPassword}
        setRevealPassword={setRevealPassword}
        submitButtonText="Confirm"
        password={newPassword}
        confirmPassword={confirmPassword}
        setPassword={setNewPassword}
        setConfirmPassword={setConfirmPassword}
        onSuccess={onAddPassword}
      />
    </Container>
  );
}

const Container = styled.div`
  padding: 32px;
`;
