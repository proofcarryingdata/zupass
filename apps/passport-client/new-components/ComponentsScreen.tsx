import { CenterColumn, TextCenter } from "../components/core";
import { AppContainer } from "../components/shared/AppContainer";
import { BigInput } from "./Input";
import { Typography } from "./Typography";

const ComponentsScreen = (): JSX.Element => {
  return (
    <AppContainer bg="gray">
      <TextCenter>Hello, world!</TextCenter>
      <Typography>Typography component</Typography>
      <CenterColumn>
        <BigInput placeholder="placeholder" />
      </CenterColumn>
    </AppContainer>
  );
};

export default ComponentsScreen;
