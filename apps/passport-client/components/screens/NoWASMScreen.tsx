import { H2, Spacer, TextCenter } from "../core";
import { AppContainer } from "../shared/AppContainer";

export function NoWASMScreen() {
  return (
    <>
      <AppContainer bg="primary">
        <Spacer h={64} />
        <TextCenter>
          <H2>No Web Assembly</H2>
          <Spacer h={24} />
          Sorry, your device does not currently support Web Assembly. Please
          consider enabling it, or alternatively, try using Zupass on a
          different device.
        </TextCenter>
        <Spacer h={64} />
      </AppContainer>
    </>
  );
}
