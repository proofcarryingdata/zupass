import { LinkButton } from "@pcd/passport-ui";
import { useLocation } from "react-router-dom";
import { CenterColumn, H1, Spacer, TextCenter } from "../core";
import { AppContainer } from "../shared/AppContainer";

export function MissingScreen(): JSX.Element {
  const loc = useLocation();

  return (
    <AppContainer bg="primary">
      <CenterColumn w={290}>
        <TextCenter>
          <Spacer h={64} />
          <H1>Page not found</H1>
          <Spacer h={24} />
          <p>Missing {loc.pathname}</p>
          <Spacer h={24} />
          <LinkButton to="/">Return to Zupass</LinkButton>
          <Spacer h={24} />
        </TextCenter>
      </CenterColumn>
    </AppContainer>
  );
}
