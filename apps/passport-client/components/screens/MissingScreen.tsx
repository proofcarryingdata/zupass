import React from "react";
import { useLocation } from "react-router-dom";
import { CenterColumn, H1, Spacer, TextCenter } from "../core";
import { LinkButton } from "../core/Button";

export function MissingScreen() {
  const loc = useLocation();

  return (
    <CenterColumn w={290}>
      <TextCenter>
        <Spacer h={64} />
        <H1>Page not found</H1>
        <Spacer h={24} />
        <p>Missing {loc.pathname}</p>
        <Spacer h={24} />
        <LinkButton to="/">Return to Passport</LinkButton>
      </TextCenter>
    </CenterColumn>
  );
}
