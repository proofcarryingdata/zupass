import { useCallback, useEffect, useState } from "react";
import { useDispatch, useQuery } from "../../../src/appHooks";
import { Button, CenterColumn, H2, TextCenter } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { ScreenLoader } from "../../shared/ScreenLoader";

export function OneClickLoginScreen(): JSX.Element | null {
  const dispatch = useDispatch();
  const query = useQuery();
  const email = query?.get("email");
  const code = query?.get("code");
  const targetFolder = query?.get("targetFolder");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleOneClickLogin = useCallback(async () => {
    if (!email || !code) {
      setError("Email and code are required.");
      return;
    }
    try {
      setLoading(true);
      await dispatch({
        type: "one-click-login",
        email,
        code,
        targetFolder
      });
    } catch (err) {
      setError("Failed to login. Please check your credentials and try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dispatch, email, code, targetFolder]);

  useEffect(() => {
    handleOneClickLogin();
  }, [handleOneClickLogin]);

  if (loading) {
    return <ScreenLoader />;
  }

  return (
    <>
      <MaybeModal />
      <CenterColumn>
        <H2>One Click Login</H2>
        {error && (
          <TextCenter>
            <p style={{ color: "red" }}>{error}</p>
          </TextCenter>
        )}
        <Button onClick={handleOneClickLogin}>Retry Login</Button>
      </CenterColumn>
    </>
  );
}
