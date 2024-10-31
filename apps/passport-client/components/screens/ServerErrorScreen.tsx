import { LinkButton } from "@pcd/passport-ui";
import { useSearchParams } from "react-router-dom";
import { CenterColumn, H1, Spacer, SupportLink, TextCenter } from "../core";
import { AppContainer } from "../shared/AppContainer";

/**
 * A generic error screen on the client that the server could redirect to on an error.
 * Items on the screen can be filled in via the `title` and `description` query params,
 * e.g., https://zupass.org/#/server-error?title=Custom+Error&description=Your+text+here.
 */
export function ServerErrorScreen(): JSX.Element {
  const [query] = useSearchParams();
  const title = query.get("title");
  const description = query.get("description");

  return (
    <AppContainer bg="primary">
      <CenterColumn w={290}>
        <TextCenter>
          <Spacer h={64} />
          <H1>{title || "An error occurred"}</H1>
          <Spacer h={24} />
          {description}
          {!!description && <Spacer h={24} />}
          For support, please send a message to <SupportLink />.
          <Spacer h={24} />
          <LinkButton to="/">Return to Zupass</LinkButton>
          <Spacer h={24} />
        </TextCenter>
      </CenterColumn>
    </AppContainer>
  );
}
