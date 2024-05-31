import { useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelf } from "../../../src/appHooks";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { ScreenLoader } from "../../shared/ScreenLoader";

export function OneClickLoginScreen(): JSX.Element | null {
  const dispatch = useDispatch();
  const { email, code, targetFolder } = useParams();

  const self = useSelf();

  const redirectToTargetFolder = useCallback(() => {
    if (targetFolder) {
      window.location.hash = `#/?folder=${encodeURIComponent(targetFolder)}`;
    } else {
      window.location.hash = "#/";
    }
  }, [targetFolder]);

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
    if (process.env.ONE_CLICK_LOGIN_ENABLED !== "true") {
      window.location.hash = "#/";
      return;
    }

    if (self) {
      if (email !== self.email) {
        alert(
          `You are already logged in as ${self.email}. Please log out and try navigating to the link again.`
        );
        window.location.hash = "#/";
      } else {
        redirectToTargetFolder();
      }
    } else if (!email || !code) {
      window.location.hash = "#/";
    } else {
      handleOneClickLogin();
    }
  }, [
    self,
    targetFolder,
    handleOneClickLogin,
    redirectToTargetFolder,
    email,
    code
  ]);

  return (
    <>
      <MaybeModal fullScreen />
      <AppContainer bg="primary">
        <ScreenLoader />
      </AppContainer>
    </>
  );
}
