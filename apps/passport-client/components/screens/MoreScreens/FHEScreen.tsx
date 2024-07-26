import { Spacer } from "@pcd/passport-ui";
import { ReactNode } from "react";
import { createGlobalStyle } from "styled-components";
import { NewButton } from "../../NewButton";
import { H1, Placeholder } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";

const OverrideStyles = createGlobalStyle`
  html {
    background-image: url("https://techcrunch.com/wp-content/uploads/2014/12/matrix.jpg?w=1000") !important;
    background-size: cover !important;
  }
`;

export function FHEScreen(): ReactNode {
  return (
    <>
      <OverrideStyles />
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <div className="flex-row flex align-center items-center gap-3 w-full bg-black rounded p-6 border-4 border-white">
          <H1 className="">FHEPASS</H1>
        </div>
        <Spacer h={24} />
        <Placeholder minH={540}>
          <div className="flex flex-col gap-2">
            <NewButton
              onClick={() => {
                window.location.href = "#/more";
              }}
            >
              Back
            </NewButton>

            <div className="p-4 border-4 border-white rounded-lg bg-black">
              <p>0xPARC</p>
              <p>is putting</p>
              <p>FHE</p>
              <p>IN A BOX!!!!</p>
            </div>
          </div>
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}
