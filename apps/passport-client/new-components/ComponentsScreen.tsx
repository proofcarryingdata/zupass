import { TextCenter } from "../components/core";
import { AppContainer } from "../components/shared/AppContainer";
import { Typography } from "./Typography";

const ComponentsScreen = (): JSX.Element => {
  return (
    <AppContainer bg="primary">
      <TextCenter>Hello, world!</TextCenter>
      <Typography>Typography component</Typography>
    </AppContainer>
  );
};

export default ComponentsScreen;
