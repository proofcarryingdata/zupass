import { CenterColumn, TextCenter } from "../components/core";
import { AppContainer } from "../components/shared/AppContainer";
import { BigInput } from "./Input";
import { Ticket } from "./Ticket";

const ComponentsScreen = (): JSX.Element => {
  return (
    <AppContainer bg="gray">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 40
        }}
      >
        <TextCenter>Hello, world!</TextCenter>
        <CenterColumn>
          <BigInput placeholder="placeholder" />
        </CenterColumn>
        <Ticket name="Richard Lu" type="Speaker" email="richard@0xparg.org" />
      </div>
    </AppContainer>
  );
};

export default ComponentsScreen;
