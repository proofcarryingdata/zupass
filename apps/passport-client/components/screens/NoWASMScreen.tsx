import { H2, Spacer, TextCenter } from "../core";
import { AppContainer } from "../shared/AppContainer";

export function NoWASMScreen() {
  return (
    <>
      <AppContainer bg="primary">
        <Spacer h={64} />
        <TextCenter>
          <H2>Browser not supported</H2>
          <Spacer h={24} />
         Your browser does not currently support WebAssembly, which is
         required for Zupass to generate zero-knowledge proofs. Try using
         Zupass on a different browser, and check that WebAssembly
         is not disabled. You can view a list of supported browsers
         <a href="https://webassembly.org/roadmap/">here</a>.
        </TextCenter>
        <Spacer h={64} />
      </AppContainer>
    </>
  );
}
