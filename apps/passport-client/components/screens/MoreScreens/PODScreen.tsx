import { Spacer } from "@pcd/passport-ui";
import { ReactNode, useState } from "react";
import { NewButton } from "../../NewButton";
import { BigInput, H1, Placeholder, ZuLogo } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";

export function PODScreen(): ReactNode {
  const [title, setTitle] = useState("TITLE");
  const [description, setDescription] = useState("DESCRIPTION");
  const [image, setImage] = useState("");

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
          <div className="flex flex-col gap-2">
            <NewButton
              onClick={() => {
                window.location.href = "#/more";
              }}
            >
              Back
            </NewButton>

            <BigInput
              placeholder="POD Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <BigInput
              placeholder="POD Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <BigInput
              placeholder="POD IMAGE"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />

            <NewButton>CREATE POD</NewButton>
          </div>
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}
