import * as React from "react";
import { useCallback, useContext } from "react";
import { DispatchContext } from "../../src/dispatch";
import { Button, H1, Spacer } from "../core";
import { AppHeader } from "../shared/AppHeader";

export function SettingsScreen() {
  const [_, dispatch] = useContext(DispatchContext);
  const onReset = useCallback(() => {
    if (window.confirm("Are you sure? This will delete your data.")) {
      dispatch({ type: "reset-passport" });
    }
  }, []);

  return (
    <>
      <Spacer h={24} />
      <AppHeader />
      <Spacer h={24} />
      <H1>Settings</H1>
      <Spacer h={24} />
      <p>
        The Zuzalu Passport is a product of 0xPARC. For app support, contact
        passport@0xparc.org
      </p>
      <Spacer h={16} />
      <p>For event or venue support, please contact [TBD] at [TBD]</p>
      <Spacer h={16} />
      <p>In the future, the passport may allow you to sync across devices.</p>
      <Spacer h={24} />
      <Button style="secondary" onClick={onReset}>
        Clear Passport
      </Button>
    </>
  );
}
