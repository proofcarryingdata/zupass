import React from "react";
import { Spacer, TextCenter } from "../../core";

export function LoggedOutScreen() {
  return (
    <TextCenter>
      <Spacer h={32} />
      You are logged out.
      <Spacer h={32} />
      Please navigate to zupass.eth.limo and log in or sync an existing
      passport.
    </TextCenter>
  );
}
