import { ZUPASS_SUPPORT_EMAIL } from "@pcd/util";
import { CenterColumn, H1, Spacer, TextCenter } from "../core";
import { LinkButton } from "../core/Button";
import { AppContainer } from "../shared/AppContainer";

export function ServerErrorScreen() {
  const query = new URLSearchParams(window.location.search);
  const title = query.get("title");
  const description = query.get("description");

  return (
    <AppContainer bg="gray">
      <CenterColumn w={290}>
        <TextCenter>
          <Spacer h={64} />
          <H1>{title || "An error occurred"}</H1>
          <Spacer h={24} />
          {description}
          {!!description && <Spacer h={24} />}
          For support, please send a message to{" "}
          <a href={`mailto:${ZUPASS_SUPPORT_EMAIL}`}>{ZUPASS_SUPPORT_EMAIL}</a>.
          <Spacer h={24} />
          <LinkButton to="/">Return to Zupass</LinkButton>
          <Spacer h={24} />
        </TextCenter>
      </CenterColumn>
    </AppContainer>
  );
}
