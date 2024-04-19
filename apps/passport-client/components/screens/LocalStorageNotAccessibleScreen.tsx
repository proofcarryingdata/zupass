import { H2, Spacer, TextCenter } from "../core";
import { AppContainer } from "../shared/AppContainer";

export function LocalStorageNotAccessibleScreen(): JSX.Element {
  return (
    <>
      <AppContainer bg="primary">
        <Spacer h={64} />
        <TextCenter>
          <H2>Please update your browser</H2>
          <Spacer h={24} />
          Your browser does not currently support accessing local storage, which
          is required for Zupass to store cryptographic data locally. Try
          <a href="https://www.chromium.org/for-testers/bug-reporting-guidelines/uncaught-securityerror-failed-to-read-the-localstorage-property-from-window-access-is-denied-for-this-document/">
            enabling third-party cookies
          </a>{" "}
          or switching/updating your browser. You can view a list of supported
          browsers <a href="https://caniuse.com/?search=localstorage">here</a>.
        </TextCenter>
        <Spacer h={64} />
      </AppContainer>
    </>
  );
}
