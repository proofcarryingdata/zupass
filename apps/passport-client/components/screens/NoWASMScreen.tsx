import {
  DEVCONNECT_2023_END,
  DEVCONNECT_2023_START
} from "../../src/sharedConstants";
import { H2, Spacer, TextCenter } from "../core";
import { AppContainer } from "../shared/AppContainer";

export function NoWASMScreen() {
  const currentTimeMs = new Date().getTime();
  const isDuringDevconnect =
    currentTimeMs >= DEVCONNECT_2023_START &&
    currentTimeMs < DEVCONNECT_2023_END;
  return (
    <>
      <AppContainer bg="primary">
        <Spacer h={64} />
        <TextCenter>
          <H2>Browser not supported</H2>
          {isDuringDevconnect && (
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
