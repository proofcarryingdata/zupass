import { isDuringDevconnect } from "../../src/devconnectUtils";
import { H2, Spacer, TextCenter } from "../core";
import { AppContainer } from "../shared/AppContainer";

export function NoWASMScreen(): JSX.Element {
  return (
    <>
      <AppContainer bg="primary">
        <Spacer h={64} />
        <TextCenter>
          <H2>Browser not supported</H2>
          {isDuringDevconnect() && (
            <>
              <Spacer h={24} />
              If you are currently at Devconnect, please visit the Zupass Help
              Desk at the entrance of the Istanbul Congress Center (ICC) for
              support.
            </>
          )}
          <Spacer h={24} />
          Your browser does not currently support WebAssembly, which is required
          for Zupass to generate zero-knowledge proofs. Try using Zupass on a
          different browser, and check that WebAssembly is not disabled. You can
          view a list of supported browsers{" "}
          <a href="https://webassembly.org/roadmap/">here</a>.
        </TextCenter>
        <Spacer h={64} />
      </AppContainer>
    </>
  );
}
