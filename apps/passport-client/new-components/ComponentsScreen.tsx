import React from "react";
import { Typography } from "./Typography";
import { AppContainer } from "../components/shared/AppContainer";
import { CenterColumn, TextCenter } from "../components/core";
import { BigInput } from "./Input";

const ComponentsScreen = (): JSX.Element => {
  return (
    <AppContainer bg="gray">
      <TextCenter>Hello, world!</TextCenter>
      <Typography>Typography component</Typography>
      <CenterColumn>
        <BigInput placeholder="fuckyaaaaoo" />
      </CenterColumn>
    </AppContainer>
  );
};

export default ComponentsScreen;
