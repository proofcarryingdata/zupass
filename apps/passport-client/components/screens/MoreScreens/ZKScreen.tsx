import { Spacer } from "@pcd/passport-ui";
import { ReactNode } from "react";
import { NewButton } from "../../NewButton";
import { H1, Placeholder, ZuLogo } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";

export function ZKScreen(): ReactNode {
  return (
    <>
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <div className="flex-row flex align-center items-center gap-3">
          <ZuLogo width="48px" /> <H1 className="">Zupass</H1>
        </div>
        <Spacer h={24} />
        <Placeholder minH={540}>
          <NewButton
            onClick={() => {
              window.location.href = "#/other";
            }}
          >
            Back
          </NewButton>
          Duck
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}
