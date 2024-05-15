import { useCallback, useEffect } from "react";
import { useDispatch, useQuery, useSelf } from "../../../src/appHooks";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { ScreenLoader } from "../../shared/ScreenLoader";

export function OneClickLoginScreen(): JSX.Element | null {
  const dispatch = useDispatch();
  const query = useQuery();
  const email = query?.get("email");
  const code = query?.get("code");
  const targetFolder = query?.get("targetFolder");

  const self = useSelf();

  const handleOneClickLogin = useCallback(async () => {
    if (!email || !code) {
      return;
    }
    try {
      await dispatch({
        type: "one-click-login",
        email,
        code,
        targetFolder
      });
    } catch (err) {
      await dispatch({
        type: "error",
        error: {
          title: "An error occured",
          message: (err as Error).message || "An error occured"
        }
      });
    }
  }, [dispatch, email, code, targetFolder]);

  useEffect(() => {
    // Redirect to home if already logged in
    if (self || !email || !code) {
      window.location.hash = targetFolder
        ? `#/?folder=${encodeURIComponent(targetFolder)}`
        : "#/";
    } else {
      handleOneClickLogin();
    }
  }, [self, targetFolder, handleOneClickLogin, email, code]);

  return (
    <>
      <MaybeModal fullScreen />
      <AppContainer bg="primary">
        <ScreenLoader />
      </AppContainer>
    </>
  );
}
